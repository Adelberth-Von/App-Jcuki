"""Exercise the installable APK on an isolated Android emulator, using one labelled QA account.
No service-role credentials, existing account changes, or credential logging.
"""
import json
import os
import re
import secrets
import struct
import subprocess
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

PACKAGE = 'com.terrence.jcuki'
OUT = Path('native-results')
OUT.mkdir(exist_ok=True)
CONFIG = Path('src/auth/config.ts').read_text()
SUPABASE = os.environ.get('EXPO_PUBLIC_SUPABASE_URL') or re.search(r'https://[a-z]+\.supabase\.co', CONFIG).group()
KEY = os.environ.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or re.search(r'sb_publishable_[^"\s]+', CONFIG).group()
API = (os.environ.get('EXPO_PUBLIC_API_URL') or SUPABASE + '/functions/v1/jcuki').rstrip('/')
EMAIL = 'jcuki.qa.native.' + os.environ.get('GITHUB_RUN_ID', str(int(time.time()))) + '.' + os.environ.get('ANDROID_API_LEVEL', 'local') + '.' + secrets.token_hex(3) + '@example.com'
PASSWORD = 'JcukiNative' + secrets.token_hex(16)
TOKEN = None
STEP = 'launch'


def adb(*args, binary=False):
    result = subprocess.run(['adb', *args], check=True, capture_output=True, timeout=40)
    return result.stdout if binary else result.stdout.decode(errors='replace')


def http(path, method='GET', body=None, auth=False):
    url = SUPABASE + path if auth else API + path
    headers = {'Content-Type': 'application/json', 'apikey': KEY}
    if not auth and TOKEN:
        headers['Authorization'] = 'Bearer ' + TOKEN
    req = urllib.request.Request(url, method=method, headers=headers, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Error codes only; never log the submitted credentials or returned tokens.
        value = json.loads(error.read() or '{}')
        raise AssertionError('API check failed: ' + str(error.code) + ' ' + str(value.get('error_code') or value.get('error') or 'request_failed')) from None


def ui():
    for _ in range(3):
        try:
            adb('shell', 'rm', '-f', '/sdcard/jcuki-ui.xml')
            adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/jcuki-ui.xml')
            value = adb('exec-out', 'cat', '/sdcard/jcuki-ui.xml')
            start = value.find('<hierarchy')
            if start < 0:
                raise ET.ParseError('Accessibility tree not ready')
            return ET.fromstring(value[start:])
        except (ET.ParseError, subprocess.CalledProcessError):
            time.sleep(.7)
    raise AssertionError('Accessibility tree was not ready after retries')


def bounds(node):
    return tuple(map(int, re.findall(r'-?\d+', node.get('bounds', ''))))


def find(label=None, test_id=None, field=False, timeout=30, contains=False):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        tree = ui()
        for node in tree.iter('node'):
            labels = (node.get('text', ''), node.get('content-desc', ''))
            matches = (test_id and node.get('resource-id', '').split('/')[-1] == test_id) or (label and (any(label in value for value in labels) if contains else label in labels))
            box = bounds(node)
            if matches and len(box) == 4 and box[2] > box[0] and box[3] > box[1] and (not field or node.get('class', '').endswith('EditText')):
                return node
        time.sleep(0.4)
    raise AssertionError('Expected control was not visible: ' + str(test_id or label))


def tap(label=None, test_id=None, field=False):
    node = find(label, test_id, field)
    x1, y1, x2, y2 = bounds(node)
    fixed_labels = {'Create a group', 'Join a group', 'Create account', 'Log in', 'Home', 'Groups', 'Profile', 'Make a plan'}
    control = test_id or (label if label in fixed_labels else 'control')
    print('TAP', control, (x1, y1, x2, y2), flush=True)
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    return node


def type_in(test_id, text):
    tap(test_id=test_id, field=True)
    assert_above_keyboard(test_id)
    # QA fixtures contain only ASCII letters, numbers, @, dot, slash and query punctuation.
    import shlex
    adb('shell', 'input', 'text', shlex.quote(text.replace(' ', '%s')))


def keyboard_top():
    dump = adb('shell', 'dumpsys', 'window', 'windows')
    insets = []
    for match in re.finditer(r'(?:mType|type)=ime\b[^\n]*(?:mFrame|frame)=\[(\d+),(\d+)\]\[(\d+),(\d+)\][^\n]*(?:mVisible|visible)=true', dump):
        _, y1, _, y2 = map(int, match.groups())
        if y2 > y1 > 0:
            insets.append(y1)
    if insets:
        return min(insets)
    chunks = re.split(r'(?=\s*Window #\d+ Window\{)', dump)
    candidates = []
    for chunk in chunks:
        if not re.search(r'^\s*Window #\d+ Window\{[^\n]*\bInputMethod\b', chunk):
            continue
        for pattern in (r'\bframe=\[(\d+),(\d+)\]\[(\d+),(\d+)\]', r'mFrame=\[(\d+),(\d+)\]\[(\d+),(\d+)\]'):
            match = re.search(pattern, chunk)
            if match:
                x1, y1, x2, y2 = map(int, match.groups())
                inset = re.search(r'\bmGivenContentInsets=\[(\d+),(\d+)\]\[(\d+),(\d+)\]', chunk)
                if inset:
                    y1 += int(inset.group(2))
                if y2 > y1 > 0:
                    candidates.append(y1)
                    break
    if not candidates:
        # Some Android versions expose IME geometry through WindowInsets only.
        for match in re.finditer(r'type=ime[^\n]*frame=\[(\d+),(\d+)\]\[(\d+),(\d+)\][^\n]*visible=true', dump):
            candidates.append(int(match.group(2)))
    if not candidates:
        raise AssertionError('Could not verify visible keyboard geometry')
    return min(candidates)


def screen_height():
    return int(re.findall(r'\d+', adb('shell', 'wm', 'size'))[-1])


def assert_above_keyboard(test_id):
    deadline = time.monotonic() + 20
    height = screen_height()
    last_top = height
    last_bounds = ()
    keyboard_visible = False
    while time.monotonic() < deadline:
        node = find(test_id=test_id, field=True, timeout=5)
        last_bounds = bounds(node)
        try:
            last_top = keyboard_top()
            keyboard_visible = height - last_top >= height * .15
        except AssertionError:
            keyboard_visible = False
        if not keyboard_visible:
            # ADB physical-key injection can collapse the IME. A touch requests the real soft keyboard.
            tap(test_id=test_id, field=True)
            time.sleep(.7)
            continue
        if node.get('focused') == 'true' and 0 <= last_bounds[1] and last_bounds[3] <= last_top:
            print('PASS keyboard bounds', test_id, last_bounds, 'IME top', last_top, flush=True)
            return
        time.sleep(.5)
    raise AssertionError(('Focused input is covered' if keyboard_visible else 'Soft keyboard did not open') + ': ' + test_id + ' bounds=' + str(last_bounds) + ' IME top=' + str(last_top))


def hide_keyboard():
    try:
        if screen_height() - keyboard_top() < screen_height() * .15:
            return
    except AssertionError:
        return
    adb('shell', 'input', 'keyevent', '4')
    time.sleep(.5)


def scroll_to(label=None, test_id=None):
    height = screen_height()
    for _ in range(7):
        try:
            node = find(label=label, test_id=test_id, timeout=2)
            box = bounds(node)
            # UIAutomator can expose controls underneath the floating tab bar.
            if height * .10 <= box[1] and box[3] <= height * .80:
                return node
        except AssertionError:
            pass
        w, h = map(int, re.findall(r'\d+', adb('shell', 'wm', 'size'))[-2:])
        adb('shell', 'input', 'swipe', str(w // 2), str(int(h * .73)), str(w // 2), str(int(h * .28)), '350')
    return find(label=label, test_id=test_id)


def record_geometry(name):
    # Only fixed control IDs and numeric coordinates leave the emulator. No pixels or input text.
    controls = []
    for node in ui().iter('node'):
        control = node.get('resource-id', '').split('/')[-1]
        if re.fullmatch(r'auth-(?:fullName|nickname|email|password|confirmPassword)|group-name|invite-code|plan-title|avatar-image|connect-submit|plan-submit', control):
            controls.append({'control': control, 'bounds': bounds(node), 'focused': node.get('focused') == 'true'})
    fixed_labels = {'Create a group': 'create-group', 'Join a group': 'join-group', 'Groups': 'groups-tab', 'Home': 'home-tab', 'Calendar': 'calendar-tab', 'Find your circle.': 'connect-heading'}
    for node in ui().iter('node'):
        label = node.get('content-desc') or node.get('text')
        if label in fixed_labels:
            controls.append({'control': fixed_labels[label], 'bounds': bounds(node), 'selected': node.get('selected') == 'true'})
    try:
        top = keyboard_top()
    except AssertionError:
        top = None
    (OUT / (name + '.json')).write_text(json.dumps({'controls': controls, 'keyboard_top': top}))


def launch():
    adb('shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1')


def png():
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    pixels = b''.join(b'\0' + bytes([66, 102, 75]) * 128 for _ in range(128))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 128, 128, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')


def login():
    type_in('auth-email', EMAIL)
    adb('shell', 'input', 'keyevent', '66')
    find(test_id='auth-password', field=True)
    assert_above_keyboard('auth-password')
    import shlex
    adb('shell', 'input', 'text', shlex.quote(PASSWORD))
    hide_keyboard()
    scroll_to('Log in')
    tap('Log in')
    find('Saved to your account', timeout=40) if STEP == 'account' else find('Home', timeout=40)


try:
    launch()
    find('Log in', timeout=60)
    scroll_to('Create account')
    tap('Create account')
    STEP = 'register keyboard'
    type_in('auth-fullName', 'QA Android')
    import shlex
    for test_id, value in [('auth-nickname', 'Native'), ('auth-email', EMAIL), ('auth-password', PASSWORD), ('auth-confirmPassword', PASSWORD)]:
        adb('shell', 'input', 'keyevent', '66')
        find(test_id=test_id, field=True)
        assert_above_keyboard(test_id)
        adb('shell', 'input', 'text', shlex.quote(value))
    assert_above_keyboard('auth-confirmPassword')
    record_geometry('register-keyboard')
    hide_keyboard()
    scroll_to('Create account')
    tap('Create account')
    STEP = 'server account verification'
    find('Create a group', timeout=50)
    TOKEN = http('/auth/v1/token?grant_type=password', 'POST', {'email': EMAIL, 'password': PASSWORD}, auth=True)['access_token']
    profile = http('/api/me')
    assert profile['nickname'] == 'Native', 'Native signup did not persist the profile'
    record_geometry('first-group')
    STEP = 'create circle keyboard'
    record_geometry('before-create')
    scroll_to('Create a group')
    tap('Create a group')
    type_in('group-name', 'Native QA Circle')
    assert_above_keyboard('group-name')
    hide_keyboard()
    scroll_to(test_id='connect-submit')
    tap(test_id='connect-submit')
    find('Share invitation', timeout=40)
    groups = http('/api/groups')['items']
    assert len(groups) == 1 and groups[0]['name'] == 'Native QA Circle', 'Circle did not persist'
    code = groups[0]['code']
    record_geometry('circle-created')
    STEP = 'join link keyboard'
    scroll_to('Join a group')
    tap('Join a group')
    type_in('invite-code', 'jcuki://join?code=' + code)
    assert_above_keyboard('invite-code')
    record_geometry('join-keyboard')
    hide_keyboard()
    scroll_to(test_id='connect-submit')
    tap(test_id='connect-submit')
    find('Share invitation', timeout=40)
    STEP = 'plan sheet keyboard'
    tap('Home')
    scroll_to(test_id='make-plan')
    tap(test_id='make-plan')
    type_in('plan-title', 'Native QA Hangout')
    assert_above_keyboard('plan-title')
    record_geometry('plan-keyboard')
    hide_keyboard()
    scroll_to(test_id='plan-submit')
    tap(test_id='plan-submit')
    find('Native QA Hangout', timeout=40, contains=True)
    STEP = 'private photo persistence'
    import base64
    image = png()
    photo = http('/api/me/avatar', 'PUT', {'base64': base64.b64encode(image).decode(), 'mime': 'image/png'})
    adb('shell', 'am', 'force-stop', PACKAGE)
    launch()
    tap('Profile')
    find(test_id='avatar-image', timeout=35)
    record_geometry('account-avatar')
    scroll_to('Saved to your account')
    find('Saved to your account', timeout=40)
    STEP = 'fresh device account recovery'
    adb('shell', 'pm', 'clear', PACKAGE)
    launch()
    find('Log in', timeout=60)
    login()
    tap('Groups')
    find(code, timeout=45)
    tap('Profile')
    find(test_id='avatar-image', timeout=35)
    record_geometry('restored-account')
    STEP = 'offline avatar after process restart'
    adb('shell', 'svc', 'wifi', 'disable')
    adb('shell', 'svc', 'data', 'disable')
    adb('shell', 'am', 'force-stop', PACKAGE)
    launch()
    tap('Profile')
    find(test_id='avatar-image', timeout=30)
    record_geometry('offline-avatar')
    print('PASS native keyboard positioning, direct signup, server profile/group sync, join link, fresh-device login and private avatar restart/offline cache')
except Exception as error:
    try:
        record_geometry('failure')
    except Exception:
        pass
    print('FAIL native check at:', STEP, type(error).__name__, str(error))
    raise SystemExit(1)
finally:
    try:
        adb('shell', 'svc', 'wifi', 'enable')
        adb('shell', 'svc', 'data', 'enable')
    except Exception:
        pass

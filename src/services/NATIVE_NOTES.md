# Native service integration

Target: Expo SDK 57. All native permissions and custom sound resources require a rebuilt Android/iOS binary after changing app config.

## App config and dependencies

Install compatible versions with `npx expo install expo-notifications expo-image-picker expo-image-manipulator expo-file-system expo-localization expo-secure-store expo-crypto @react-native-async-storage/async-storage`.

Configure `expo-notifications` with `sounds: ["./assets/sounds/jcuki_chime.wav"]` and `defaultChannel: "jcuki-reminders-v1"`. The underscore is required for Android resource naming. Configure `expo-image-picker` with `cameraPermission: false`, `microphonePermission: false`, and a clear photo permission description. The feature uses only the selected photo through the system photo picker, without requesting broad gallery access. Configure `expo-secure-store` for its Android backup rules.

## Profile photos

`pickProfilePhoto()` opens the native gallery picker and returns a square JPEG URI, or null when cancelled. Photos start at 512px, with a smaller fallback for the backend's 192 KiB upload limit. Native photos are copied into app documents rather than left in a temporary picker cache. The app commits a selection locally immediately, then uploads using `getProfilePhotoUpload(uri)`; an upload failure keeps the new local photo and displays its pending sync state. A transactional alternative is available through `pickProfilePhoto({persist: false})`, `commitProfilePhoto(uri)`, and `discardProfilePhoto(uri)` when retaining the previous avatar on failure is preferred. This photo is local until the app explicitly calls its backend upload endpoint.

## Preferences and identity

Preferences use AsyncStorage, with validation and device-derived defaults. Use `getEffectiveTimeZone()` each time the app resumes: automatic mode follows device timezone changes. IANA `Europe/Berlin` handles both CET and CEST; fixed strings such as CET or UTC+1 should not be used to represent Berlin year-round.

`getOrCreateDeviceToken()` generates 32 cryptographic random bytes encoded as 64 lowercase hexadecimal characters, matching the API bearer contract. `getDeviceUserId()` returns the complete SHA-256 hex digest of that token, matching the mobile backend's profile and membership IDs. Native identity lives in SecureStore. The browser preview uses AsyncStorage. This remains a legacy migration proof. New accounts use Supabase Auth JWTs and chunked SecureStore sessions; the first verified login can link an unclaimed legacy profile. Once linked, the device credential alone is rejected. Account IDs scope cached state and local photos. Do not log or place the token in URLs.

## Notifications

Call `initializeNotifications(language)` during startup. Enabling a reminder or tapping the test button should call `requestNotificationPermission(language)` in response to that action. Android 13 requires notification consent. `setWeeklyReminder(preferences)` never prompts. Refresh weekly and event schedules when the app returns to the foreground or changes preferences. Pass only confirmed events this member accepted to `syncEventReminders()`; cancellation/declining must resync it.

Automatic timezone uses the native weekly trigger. For an explicit IANA timezone, iOS uses a repeating calendar trigger. Android receives the next 12 weekly reminder dates, each calculated with that zone's DST rules; opening the app refreshes the plan. If the app is unopened for more than 12 weeks in explicit-zone mode, weekly reminder scheduling must be refreshed by reopening it. At most 32 upcoming event reminders are scheduled, keeping space below iOS's pending notification limit. Events use absolute UTC instants.

JCuki Chime is an original procedural, 1.48-second, mono 44.1kHz 16-bit PCM WAV. Regenerate it with `node scripts/generate-notification-sound.mjs`. Its playback must be verified in an installed development/release build: Expo Go does not contain app-specific custom sound resources. The test notification is scheduled five seconds after a user taps the test action.

These are local OS reminders, not remote group-change pushes. Group updates received only while the app synchronizes cannot alert an unopened device without a push backend. Sound respects device silent/Focus modes and notification channel settings. Android battery optimizations can delay delivery. Exact delivery timing requires Android alarm access; avoid promising alarm-clock precision unless that permission flow is implemented and tested.

## OS actions and calendar export

`openUninstallSettings()` opens the JCuki Android app-info page, where the user chooses Uninstall and confirms through Android. It requests no package-delete permission. It returns `manual` on iOS for the translated `uninstallInstructions()`, and `preview` in Expo Go/browser so the host app is not mistaken for JCuki. `shareCalendarEvent()` creates an `.ics` file through the shared calendar serializer and opens the native share sheet; the browser downloads the `.ics`. Users complete calendar import in their chosen calendar app.

## Official references

- [Expo 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [Expo 57 image picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)
- [Expo 57 image manipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) (currently version 57)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) (currently version 57)
- [Expo 57 localization](https://docs.expo.dev/versions/v57.0.0/sdk/localization/)
- [Expo 57 cryptography](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/)

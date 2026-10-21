/** Public-client, live Supabase QA. Creates three labelled QA accounts; never logs credentials. */
import { randomBytes } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../src/auth/config.ts";
import { createApiClient } from "../src/lib/api.ts";
import { localDate } from "../src/lib/domain.ts";

const base = (
  process.env.EXPO_PUBLIC_API_URL || SUPABASE_URL + "/functions/v1/jcuki"
).replace(/\/$/, "");
const run =
  (process.env.GITHUB_RUN_ID || Date.now()) +
  "." +
  randomBytes(3).toString("hex");
let step = "initialize";
const results = [];
function check(value, label) {
  if (!value) throw new Error(label);
}
function client() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
async function request(path, method, body, token) {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json().catch(() => ({})),
  };
}
async function token(auth) {
  const { data, error } = await auth.auth.getSession();
  check(!error && data.session?.access_token, "session_missing");
  return data.session.access_token;
}
function api(auth) {
  return createApiClient({ baseUrl: base, getToken: () => token(auth) });
}
function png() {
  const chunk = (name, data) => {
    const kind = Buffer.from(name),
      length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc32(Buffer.concat([kind, data])));
    return Buffer.concat([length, kind, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(128);
  header.writeUInt32BE(128, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.concat(
    Array.from({ length: 128 }, () =>
      Buffer.concat([Buffer.from([0]), Buffer.alloc(128 * 3, 100)]),
    ),
  );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
try {
  step = "register_three_accounts";
  const people = [];
  for (const [index, zone] of [
    "Asia/Jakarta",
    "Asia/Tokyo",
    "America/New_York",
  ].entries()) {
    const fields = {
      fullName: "Jcuki System QA " + index,
      nickname: "QA Friend " + index,
      email: `jcuki.qa.system.${run}.${index}@example.com`,
      password: "JcukiQA" + randomBytes(20).toString("hex"),
      zone,
    };
    fields.confirmPassword = fields.password;
    check(
      (await request("/auth/register", "POST", fields)).status === 201,
      "registration_failed",
    );
    const auth = client();
    const { data, error } = await auth.auth.signInWithPassword({
      email: fields.email,
      password: fields.password,
    });
    check(!error && data.user?.id, "login_failed");
    const service = api(auth);
    // Exercise concurrent first reads, like the app's initial profile/group refresh.
    const [profile] = await Promise.all([
      service.getProfile(),
      service.listGroups(),
    ]);
    check(
      profile.nickname === fields.nickname && profile.zone === zone,
      "profile_metadata_missing",
    );
    people.push({ fields, auth, service, profile, userId: data.user.id });
  }
  results.push("registration_and_server_profiles_three_timezones");
  step = "invalid_credentials_and_duplicate_email";
  const one = people[0],
    two = people[1],
    three = people[2];
  const wrong = await client().auth.signInWithPassword({
    email: one.fields.email,
    password: "incorrect_qa_password",
  });
  check(wrong.error && !wrong.data.session, "wrong_password_accepted");
  check(
    (await request("/auth/register", "POST", one.fields)).status === 409,
    "duplicate_email_accepted",
  );
  results.push("wrong_password_and_duplicate_email_rejected");
  step = "second_device_login";
  const second = client();
  const login = await second.auth.signInWithPassword({
    email: one.fields.email,
    password: one.fields.password,
  });
  check(
    !login.error && login.data.user.id === one.userId,
    "second_login_failed",
  );
  const secondApi = api(second);
  check(
    (await secondApi.getProfile()).id === one.profile.id,
    "second_device_profile_differs",
  );
  const updated = await one.service.upsertProfile({
    nickname: "QA Updated",
    fullName: "QA Private Full Name",
    zone: one.fields.zone,
  });
  check(
    (await secondApi.getProfile()).nickname === updated.nickname,
    "profile_sync_failed",
  );
  results.push("same_account_independent_device_sessions_and_profile_sync");
  step = "group_invites_and_membership";
  const group = await one.service.createGroup("System QA " + run.slice(0, 14));
  check(
    (
      await request(
        "/api/groups/" + group.id,
        "GET",
        undefined,
        await token(three.auth),
      )
    ).status === 403,
    "outsider_read_allowed",
  );
  check(
    (
      await request(
        "/api/join",
        "POST",
        { code: "222222222222" },
        await token(two.auth),
      )
    ).status === 404,
    "invalid_invite_accepted",
  );
  for (const person of [two, three]) await person.service.joinGroup(group.code);
  const shared = await three.service.getGroup(group.id);
  check(
    shared.members.length === 3 &&
      shared.members.every((member) => !("fullName" in member)),
    "membership_or_privacy_failed",
  );
  check(
    (await secondApi.listGroups()).items.some((item) => item.id === group.id),
    "device_group_sync_failed",
  );
  results.push("group_create_join_three_members_and_outsider_rejection");
  step = "day_off_hours_and_plans";
  const start = new Date(Date.now() + 7 * 86400000).toISOString(),
    end = new Date(Date.parse(start) + 3600000).toISOString();
  for (const person of people)
    await person.service.updateDaysOff(
      group.id,
      [
        {
          date: localDate(start, person.fields.zone),
          zone: person.fields.zone,
          confirmedAt: "1900-01-01T00:00:00Z",
        },
      ],
      [{ id: "qa-slot", start, end, status: "yes" }],
    );
  const schedule = await secondApi.getGroup(group.id);
  check(
    schedule.members.every(
      (member) =>
        member.slots[0]?.start === start &&
        !member.daysOff[0].confirmedAt.startsWith("1900"),
    ),
    "schedule_sync_failed",
  );
  const event = await one.service.createEvent(group.id, {
    title: "QA shared plan",
    start,
    end,
    minimum: 3,
  });
  for (const person of [two, three])
    await person.service.respondToEvent(group.id, event.id, "yes");
  check(
    Object.values(
      (await secondApi.getGroup(group.id)).events.find(
        (item) => item.id === event.id,
      ).responses,
    ).filter((value) => value === "yes").length === 3,
    "responses_not_synced",
  );
  check(
    (
      await request(
        `/api/groups/${group.id}/events/${event.id}`,
        "DELETE",
        undefined,
        await token(two.auth),
      )
    ).status === 403,
    "non_creator_cancel_allowed",
  );
  results.push("days_off_playing_hours_and_three_person_plan_confirmation");
  step = "event_and_activity_pagination";
  for (let index = 0; index < 21; index++)
    await one.service.createEvent(group.id, {
      title: "QA pagination " + index,
      start: new Date(Date.parse(start) + (index + 1) * 7200000).toISOString(),
      end: new Date(Date.parse(end) + (index + 1) * 7200000).toISOString(),
      minimum: 2,
    });
  const page1 = await secondApi.listEvents(group.id),
    page2 = await secondApi.listEvents(group.id, { cursor: page1.nextCursor });
  check(
    page1.items.length === 20 &&
      page2.items.length === 2 &&
      new Set([...page1.items, ...page2.items].map((item) => item.id)).size ===
        22 &&
      page2.nextCursor === null,
    "event_pagination_failed",
  );
  const activity1 = await three.service.listActivity(group.id),
    activity2 = await three.service.listActivity(group.id, {
      cursor: activity1.nextCursor,
    });
  check(
    activity1.items.length === 20 &&
      activity2.items.length > 0 &&
      activity2.items.every(
        (item) => !activity1.items.some((old) => old.id === item.id),
      ),
    "activity_pagination_failed",
  );
  await one.service.cancelEvent(group.id, event.id);
  check(
    (
      await request(
        `/api/groups/${group.id}/events/${event.id}/response`,
        "PUT",
        { value: "yes" },
        await token(two.auth),
      )
    ).status === 409,
    "closed_plan_response_allowed",
  );
  results.push("paginated_events_activity_and_closed_plan_handling");
  step = "private_avatar_and_session_refresh";
  const photo = await one.service.uploadAvatar({
    base64: png().toString("base64"),
    mime: "image/png",
  });
  const recovered = await secondApi.getProfile();
  check(photo.avatarUri === recovered.avatarUri, "photo_profile_sync_failed");
  const image = await fetch(recovered.avatarUri, {
    headers: { Authorization: "Bearer " + (await token(second)) },
  });
  check(
    image.status === 200 && (await image.arrayBuffer()).byteLength > 33,
    "private_photo_failed",
  );
  check(
    (await fetch(recovered.avatarUri)).status === 401,
    "private_photo_publicly_readable",
  );
  const refreshed = await second.auth.refreshSession();
  check(
    !refreshed.error && (await secondApi.getProfile()).id === one.profile.id,
    "session_refresh_failed",
  );
  check(
    !(await one.auth.auth.signOut({ scope: "local" })).error,
    "local_logout_failed",
  );
  check(
    (await secondApi.getGroup(group.id)).members.length === 3,
    "logout_revoked_other_device",
  );
  results.push("private_photo_other_device_refresh_and_independent_logout");
  console.log(
    JSON.stringify(
      {
        status: "passed",
        checks: results,
        qaAccountsCreated: 3,
        eventPages: [20, 2],
      },
      null,
      2,
    ),
  );
} catch (error) {
  const rawCode = error?.code || error?.message || "unknown";
  const code = /^[a-zA-Z_]{1,60}$/.test(rawCode) ? rawCode : "request_failed";
  console.error(
    JSON.stringify({ status: "failed", step, code, completed: results }),
  );
  process.exitCode = 1;
}

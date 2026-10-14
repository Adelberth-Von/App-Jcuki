import test from "node:test";
import assert from "node:assert/strict";
import { environment, tokens, call, register } from "./helpers/backend.mjs";
import { deliverPush } from "../backend/notifications.mjs";
async function circle() {
  const env = environment();
  const people = await Promise.all(
    [0, 1, 2, 3].map((i) => register(env, tokens[i], i)),
  );
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "Our people" })
  ).data;
  await call(env, tokens[1], "/api/join", "POST", { code: group.code });
  await call(env, tokens[2], "/api/join", "POST", { code: group.code });
  for (const i of [0, 1, 2])
    await call(env, tokens[i], "/api/me/push", "PUT", {
      token: `ExpoPushToken[device_token_${i}]`,
      language: i === 1 ? "en" : "id",
      sound: i !== 2,
      zone: people[i].zone,
    });
  return { env, people, group, path: "/api/groups/" + group.id };
}
test("schedule and activity/outbox are one transaction, scoped to members, never sent to actor", async () => {
  const { env, people, group, path } = await circle();
  const day = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
  const result = await call(env, tokens[0], path + "/days-off", "PUT", {
    daysOff: [{ date: day, zone: "Asia/Jakarta" }],
  });
  assert.equal(result.status, 200);
  const records = env.sqlite
    .prepare("SELECT * FROM activities WHERE kind=?")
    .all("schedule_updated");
  assert.equal(records.length, 1);
  const jobs = env.sqlite
    .prepare("SELECT * FROM push_outbox WHERE activity_id=?")
    .all(records[0].id);
  assert.equal(jobs.length, 2);
  assert(jobs.every((j) => j.user_id !== people[0].id));
  const english = JSON.parse(
    jobs.find((j) => j.user_id === people[1].id).payload,
  );
  assert.equal(english.body, "Friend 0 updated their schedule.");
  assert.equal(english.sound, "jcuki_chime.wav");
  const silent = JSON.parse(
    jobs.find((j) => j.user_id === people[2].id).payload,
  );
  assert.equal(silent.sound, null);
  assert.equal(silent.channelId, "jcuki-activity-silent-v2");
  assert.equal(silent.data.groupId, group.id);
  assert.equal((await call(env, tokens[3], path + "/activity")).status, 403);
  const again = await call(env, tokens[0], path + "/days-off", "PUT", {
    daysOff: [{ date: day, zone: "Asia/Jakarta" }],
  });
  assert.equal(again.status, 200);
  assert.equal(
    env.sqlite
      .prepare("SELECT COUNT(*) n FROM activities WHERE kind=?")
      .get("schedule_updated").n,
    1,
  );
  env.sqlite.exec(
    "CREATE TRIGGER reject_queue BEFORE INSERT ON push_outbox BEGIN SELECT RAISE(ABORT,'TEST_OUTBOX_FAILURE'); END",
  );
  const failure = await call(env, tokens[0], path + "/days-off", "PUT", {
    daysOff: [],
  });
  assert.equal(failure.status, 500);
  assert.equal(
    JSON.parse(
      env.sqlite
        .prepare("SELECT days_off FROM members WHERE user_id=? AND group_id=?")
        .get(people[0].id, group.id).days_off,
    ).length,
    1,
  );
});
test("push validates tokens, respects opt-out and records provider tickets and receipts", async () => {
  const { env, people, path } = await circle();
  assert.equal(
    (
      await call(env, tokens[3], "/api/me/push", "PUT", {
        token: "ExpoPushToken[device_token_1]",
        language: "id",
        sound: true,
        zone: "UTC",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(env, tokens[3], "/api/me/push", "PUT", {
        token: "https://evil.test",
        language: "id",
        sound: true,
        zone: "UTC",
      })
    ).status,
    400,
  );
  await call(env, tokens[0], path + "/availability", "PUT", {
    slots: [
      {
        id: "s",
        start: new Date(Date.now() + 86400000).toISOString(),
        end: new Date(Date.now() + 90000000).toISOString(),
        status: "yes",
      },
    ],
  });
  await call(env, tokens[2], "/api/me/push", "DELETE");
  let sent = [];
  env.PUSH_ENABLED = "true";
  env.PUSH_FETCH = async (url, request) => {
    const body = JSON.parse(request.body);
    if (url.endsWith("/send")) {
      sent.push(...body);
      return Response.json({
        data: body.map((_, i) => ({ status: "ok", id: "ticket-" + i })),
      });
    }
    return Response.json({
      data: Object.fromEntries(body.ids.map((id) => [id, { status: "ok" }])),
    });
  };
  await deliverPush(env);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "ExpoPushToken[device_token_1]");
  assert.equal(
    env.sqlite
      .prepare("SELECT COUNT(*) n FROM push_outbox WHERE state='skipped'")
      .get().n,
    1,
  );
  await deliverPush(env);
  assert.equal(sent.length, 1, "An accepted ticket must never be sent again");
  const receiptFetch = env.PUSH_FETCH;
  env.PUSH_FETCH = async () => Response.json({ data: {} });
  env.sqlite
    .prepare("UPDATE push_outbox SET next_attempt=? WHERE state='ticket'")
    .run("2000-01-01T00:00:00Z");
  await deliverPush(env);
  assert.equal(
    env.sqlite
      .prepare("SELECT state FROM push_outbox WHERE ticket_id IS NOT NULL")
      .get().state,
    "ticket",
    "A delayed receipt stays pending without sending the notification again",
  );
  assert.equal(sent.length, 1);
  env.PUSH_FETCH = receiptFetch;
  env.sqlite
    .prepare("UPDATE push_outbox SET next_attempt=? WHERE state='ticket'")
    .run("2000-01-01T00:00:00Z");
  await deliverPush(env);
  assert.equal(
    env.sqlite
      .prepare("SELECT COUNT(*) n FROM push_outbox WHERE state='delivered'")
      .get().n,
    1,
  );
  assert.equal(
    env.sqlite
      .prepare("SELECT enabled FROM push_devices WHERE user_id=?")
      .get(people[2].id).enabled,
    0,
  );
});
test("activity cursor pages are stable and cannot cross groups", async () => {
  const { env, path } = await circle();
  const start = Date.now() + 86400000;
  for (let i = 0; i < 7; i++)
    await call(env, tokens[0], path + "/availability", "PUT", {
      slots: [
        {
          id: "s" + i,
          start: new Date(start + i * 86400000).toISOString(),
          end: new Date(start + i * 86400000 + 3600000).toISOString(),
          status: "yes",
        },
      ],
    });
  const first = (await call(env, tokens[1], path + "/activity?limit=4")).data;
  assert.equal(first.items.length, 4);
  assert(first.nextCursor);
  const next = (
    await call(
      env,
      tokens[1],
      path + "/activity?limit=4&cursor=" + first.nextCursor,
    )
  ).data;
  assert.equal(
    new Set([...first.items, ...next.items].map((a) => a.id)).size,
    8,
  );
  const second = (
    await call(env, tokens[1], "/api/groups", "POST", { name: "Second" })
  ).data;
  assert.equal(
    (
      await call(
        env,
        tokens[1],
        "/api/groups/" + second.id + "/activity?cursor=" + first.nextCursor,
      )
    ).status,
    400,
  );
});
test("temporary provider failure preserves retry queue; unregistered devices are retired", async () => {
  const { env, path } = await circle();
  await call(env, tokens[0], path + "/availability", "PUT", {
    slots: [
      {
        id: "s",
        start: new Date(Date.now() + 86400000).toISOString(),
        end: new Date(Date.now() + 90000000).toISOString(),
        status: "yes",
      },
    ],
  });
  env.PUSH_ENABLED = "true";
  env.PUSH_FETCH = async () => new Response("Busy", { status: 503 });
  await deliverPush(env);
  assert.equal(
    env.sqlite
      .prepare("SELECT COUNT(*) n FROM push_outbox WHERE state='pending'")
      .get().n,
    2,
  );
  env.sqlite
    .prepare("UPDATE push_outbox SET next_attempt=?")
    .run("2000-01-01T00:00:00Z");
  env.PUSH_FETCH = async () =>
    Response.json({
      data: [
        { status: "error", details: { error: "DeviceNotRegistered" } },
        { status: "error", details: { error: "DeviceNotRegistered" } },
      ],
    });
  await deliverPush(env);
  assert.equal(
    env.sqlite
      .prepare("SELECT COUNT(*) n FROM push_outbox WHERE state='failed'")
      .get().n,
    2,
  );
  assert.equal(
    env.sqlite
      .prepare("SELECT COUNT(*) n FROM push_devices WHERE enabled=0")
      .get().n,
    2,
  );
});

test("plan, response, cancellation and profile changes produce scoped activity and exclude their actors", async () => {
  const { env, people, path } = await circle();
  const created = await call(env, tokens[0], path + "/events", "POST", {
    title: "Late shift catch-up",
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 93600000).toISOString(),
    minimum: 2,
  });
  assert.equal(created.status, 201);
  assert.equal(
    (
      await call(
        env,
        tokens[1],
        path + "/events/" + created.data.id + "/response",
        "PUT",
        { value: "yes" },
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(env, tokens[0], path + "/events/" + created.data.id, "DELETE"))
      .status,
    200,
  );
  assert.equal(
    (
      await call(env, tokens[2], "/api/me", "PUT", {
        nickname: "New nickname",
        zone: "Europe/Berlin",
      })
    ).status,
    200,
  );
  const activities = env.sqlite.prepare("SELECT * FROM activities").all();
  for (const [kind, actor] of [
    ["event_created", people[0]],
    ["response_updated", people[1]],
    ["event_cancelled", people[0]],
    ["profile_updated", people[2]],
  ]) {
    const activity = activities.find((a) => a.kind === kind);
    assert(activity, kind + " should be in group history");
    assert.equal(activity.actor_id, actor.id);
    const jobs = env.sqlite
      .prepare("SELECT * FROM push_outbox WHERE activity_id=?")
      .all(activity.id);
    assert.equal(jobs.length, 2);
    assert(jobs.every((job) => job.user_id !== actor.id));
    if (kind !== "profile_updated")
      assert.equal(activity.event_id, created.data.id);
    else assert.equal(activity.actor_name, "New nickname");
  }
});

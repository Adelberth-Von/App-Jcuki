import test from "node:test";
import assert from "node:assert/strict";

import {
  environment,
  tokens,
  call,
  register,
  future,
} from "./helpers/backend.mjs";

test("explicit days off sync across members without hours or forged confirmation times", async () => {
  const env = environment();
  const own = await register(env, tokens[0]);
  await register(env, tokens[1], 1);
  await register(env, tokens[3], 3);
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "Days off" })
  ).data;
  await call(env, tokens[1], "/api/join", "POST", { code: group.code });
  const path = "/api/groups/" + group.id,
    date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const day = {
    date,
    zone: "Europe/Berlin",
    confirmedAt: "1900-01-01T00:00:00Z",
  };
  const saved = await call(env, tokens[0], path + "/days-off", "PUT", {
    daysOff: [day],
  });
  assert.equal(saved.status, 200);
  assert.notEqual(saved.data.daysOff[0].confirmedAt, day.confirmedAt);
  const read = (await call(env, tokens[1], path)).data.members.find(
    (m) => m.id === own.id,
  );
  assert.deepEqual(read.slots, []);
  assert.deepEqual(read.daysOff, saved.data.daysOff);
  assert.equal(
    (await call(env, tokens[3], path + "/days-off", "PUT", { daysOff: [day] }))
      .status,
    403,
  );
  const again = await call(env, tokens[0], path + "/days-off", "PUT", {
    daysOff: [day],
  });
  assert.equal(
    again.data.daysOff[0].confirmedAt,
    saved.data.daysOff[0].confirmedAt,
  );
  for (const invalid of [
    [{ date: "2027-02-30", zone: "Europe/Berlin" }],
    [{ date, zone: "invalid/zone" }],
    [day, day],
    [{ date: "2000-01-01", zone: "UTC" }],
  ]) {
    assert.equal(
      (
        await call(env, tokens[0], path + "/days-off", "PUT", {
          daysOff: invalid,
        })
      ).status,
      400,
    );
  }
  env.sqlite.close();
});

test("hours never confirm a day; cancelling a day and its hours is atomic", async () => {
  const env = environment(),
    own = await register(env, tokens[0]);
  const group = (
      await call(env, tokens[0], "/api/groups", "POST", { name: "Hours" })
    ).data,
    path = "/api/groups/" + group.id;
  const slots = [
    { id: "hours", start: future(120), end: future(180), status: "yes" },
  ];
  assert.equal(
    (await call(env, tokens[0], path + "/availability", "PUT", { slots }))
      .status,
    200,
  );
  assert.deepEqual(
    (await call(env, tokens[0], path)).data.members.find((m) => m.id === own.id)
      .daysOff,
    [],
  );
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    daysOff = [{ date, zone: "Asia/Jakarta" }];
  await call(env, tokens[0], path + "/days-off", "PUT", { daysOff });
  assert.equal(
    (
      await call(env, tokens[0], path + "/days-off", "PUT", {
        daysOff: [],
        slots: [{ ...slots[0], end: slots[0].start }],
      })
    ).status,
    400,
  );
  let member = (await call(env, tokens[0], path)).data.members.find(
    (m) => m.id === own.id,
  );
  assert.equal(member.daysOff.length, 1);
  assert.equal(member.slots.length, 1);
  assert.equal(
    (
      await call(env, tokens[0], path + "/days-off", "PUT", {
        daysOff: [],
        slots: [],
      })
    ).status,
    200,
  );
  member = (await call(env, tokens[0], path)).data.members.find(
    (m) => m.id === own.id,
  );
  assert.deepEqual(member.daysOff, []);
  assert.deepEqual(member.slots, []);
  env.sqlite.close();
});

test("three real identities share availability and confirm; outsiders cannot read or change group", async () => {
  const env = environment(),
    ids = [];
  for (let index = 0; index < 4; index++)
    ids.push((await register(env, tokens[index], index)).id);
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "After Hours" })
  ).data;
  for (const token of tokens.slice(1, 3))
    assert.equal(
      (await call(env, token, "/api/join", "POST", { code: group.code }))
        .status,
      200,
    );
  assert.equal(
    (await call(env, tokens[3], "/api/groups/" + group.id)).status,
    403,
  );
  const start = future(120),
    end = future(180);
  for (const token of tokens.slice(0, 3))
    assert.equal(
      (
        await call(env, token, `/api/groups/${group.id}/availability`, "PUT", {
          slots: [{ id: "slot", start, end, status: "yes" }],
        })
      ).status,
      200,
    );
  const event = (
    await call(env, tokens[0], `/api/groups/${group.id}/events`, "POST", {
      title: "Game night",
      start,
      end,
      minimum: 3,
    })
  ).data;
  for (const token of tokens.slice(1, 3))
    assert.equal(
      (
        await call(
          env,
          token,
          `/api/groups/${group.id}/events/${event.id}/response`,
          "PUT",
          { value: "yes" },
        )
      ).status,
      200,
    );
  const snapshot = (await call(env, tokens[0], "/api/groups/" + group.id)).data;
  assert.equal(snapshot.members.length, 3);
  assert.ok(snapshot.members.every((member) => member.slots.length === 1));
  assert.deepEqual(
    Object.keys(snapshot.events[0].responses).sort(),
    ids.slice(0, 3).sort(),
  );
  assert.equal(
    (
      await call(
        env,
        tokens[1],
        `/api/groups/${group.id}/events/${event.id}`,
        "DELETE",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        env,
        tokens[0],
        `/api/groups/${group.id}/events/${event.id}`,
        "DELETE",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        env,
        tokens[1],
        `/api/groups/${group.id}/events/${event.id}/response`,
        "PUT",
        { value: "yes" },
      )
    ).status,
    409,
  );
  env.sqlite.close();
});

test("server pagination loads groups and events once and rejects cross-scope cursors", async () => {
  const env = environment();
  await register(env, tokens[0]);
  await register(env, tokens[1]);
  const created = [];
  for (let index = 0; index < 7; index++)
    created.push(
      (
        await call(env, tokens[0], "/api/groups", "POST", {
          name: "Group " + index,
        })
      ).data.id,
    );
  let cursor,
    seen = [];
  do {
    const page = (
      await call(
        env,
        tokens[0],
        "/api/groups?limit=3" + (cursor ? "&cursor=" + cursor : ""),
      )
    ).data;
    seen.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.deepEqual(seen.sort(), created.sort());
  assert.equal(new Set(seen).size, 7);
  const first = (await call(env, tokens[0], "/api/groups?limit=2")).data;
  assert.equal(
    (await call(env, tokens[1], "/api/groups?cursor=" + first.nextCursor)).data
      .error,
    "INVALID_CURSOR",
  );
  const gid = created[0],
    events = [];
  for (let index = 0; index < 7; index++)
    events.push(
      (
        await call(env, tokens[0], `/api/groups/${gid}/events`, "POST", {
          title: "Event " + index,
          start: future(120 + index),
          end: future(180 + index),
          minimum: 1,
        })
      ).data.id,
    );
  cursor = undefined;
  seen = [];
  do {
    const page = (
      await call(
        env,
        tokens[0],
        `/api/groups/${gid}/events?limit=3` +
          (cursor ? "&cursor=" + cursor : ""),
      )
    ).data;
    seen.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.deepEqual(seen.sort(), events.sort());
  assert.equal((await call(env, tokens[0], "/api/groups?limit=0")).status, 400);
  env.sqlite.close();
});

test("profile photos are bounded and only readable by their owner or shared-group members", async () => {
  const env = environment();
  const owner = await register(env, tokens[0]);
  await register(env, tokens[1]);
  await register(env, tokens[2]);
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";
  const uploaded = await call(env, tokens[0], "/api/me/avatar", "PUT", {
    base64,
    mime: "image/png",
  });
  assert.equal(uploaded.status, 200);
  assert.ok(uploaded.data.avatarUri);
  assert.equal(
    (await call(env, tokens[1], "/api/avatars/" + owner.id)).status,
    403,
  );
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "Photos" })
  ).data;
  await call(env, tokens[1], "/api/join", "POST", { code: group.code });
  assert.equal(
    (await call(env, tokens[1], "/api/avatars/" + owner.id)).status,
    200,
  );
  assert.equal(
    (await call(env, tokens[2], "/api/avatars/" + owner.id)).status,
    403,
  );
  const huge = Buffer.from(base64, "base64");
  huge.writeUInt32BE(4096, 16);
  assert.equal(
    (
      await call(env, tokens[0], "/api/me/avatar", "PUT", {
        base64: huge.toString("base64"),
        mime: "image/png",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(env, tokens[0], "/api/me/avatar", "PUT", {
        base64,
        mime: "image/svg+xml",
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(env, tokens[0], "/api/me/avatar", "DELETE")).status,
    200,
  );
  assert.equal(
    (await call(env, tokens[0], "/api/avatars/" + owner.id)).status,
    404,
  );
  env.sqlite.close();
});

test("authentication, origin checks and validation fail without altering persisted values", async () => {
  const env = environment();
  await register(env, tokens[0]);
  assert.equal((await call(env, "bad", "/api/groups")).status, 401);
  assert.equal(
    (
      await call(
        env,
        tokens[0],
        "/api/me",
        "PUT",
        { nickname: "Other", zone: "Asia/Jakarta" },
        { Origin: "https://other.test" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(env, tokens[0], "/api/me", "PUT", {
        nickname: "Other",
        zone: "Fake/Zone",
      })
    ).status,
    400,
  );
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "Rules" })
  ).data;
  assert.equal(
    (
      await call(
        env,
        tokens[0],
        `/api/groups/${group.id}/availability`,
        "PUT",
        {
          slots: [
            {
              id: "x",
              start: "2026-02-31T14:00:00Z",
              end: "2026-03-03T15:00:00Z",
              status: "yes",
            },
          ],
        },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(env, tokens[0], `/api/groups/${group.id}/events`, "POST", {
        title: "Rules",
        start: future(100),
        end: future(200),
        minimum: 2,
      })
    ).data.error,
    "INVALID_MINIMUM",
  );
  assert.equal(
    (await call(env, tokens[0], "/api/me")).data.nickname,
    "Friend 0",
  );
  env.sqlite.close();
});

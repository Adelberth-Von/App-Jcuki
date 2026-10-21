import test from "node:test";
import assert from "node:assert/strict";
import {
  environment,
  tokens,
  register,
  call,
  future,
} from "./helpers/backend.mjs";
import { handleAPI } from "../backend/index.mjs";
import { createApiClient } from "../src/lib/api.ts";
import { readPageWindow, refreshGroupWindow } from "../src/lib/pageWindow.ts";

test("refresh preserves opened event/history pages, current responses, and a usable cursor", async () => {
  const env = environment();
  const own = await register(env, tokens[0]);
  await register(env, tokens[1], 1);
  const api = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => tokens[0],
    fetcher: async (url, options) => handleAPI(new Request(url, options), env),
  });
  const summary = await api.createGroup("Pagination regression");
  await call(env, tokens[1], "/api/join", "POST", { code: summary.code });
  const events = [];
  for (let index = 0; index < 45; index++) {
    events.push(
      await api.createEvent(summary.id, {
        title: "Plan " + index,
        start: future(120 + index * 60),
        end: future(150 + index * 60),
        minimum: 2,
      }),
    );
  }
  // Past records are a local database fixture, never a backdated production write.
  for (const event of events.slice(0, 3))
    env.sqlite
      .prepare("UPDATE events SET start=?,end=? WHERE id=?")
      .run("2020-01-01T12:00:00.000Z", "2020-01-01T13:00:00.000Z", event.id);
  const first = await api.getGroup(summary.id);
  const second = await api.listEvents(summary.id, {
    cursor: first.eventsNextCursor,
  });
  const history = await api.listEvents(summary.id, { view: "history" });
  const opened = {
    ...first,
    events: [...first.events, ...second.items, ...history.items],
    eventsNextCursor: second.nextCursor,
    historyLoaded: true,
    historyNextCursor: history.nextCursor,
  };
  const changed = second.items[0];
  await call(
    env,
    tokens[1],
    `/api/groups/${summary.id}/events/${changed.id}/response`,
    "PUT",
    { value: "maybe" },
  );
  await api.cancelEvent(summary.id, events[30].id);
  const refreshed = await refreshGroupWindow(
    api,
    await api.getGroup(summary.id),
    opened,
  );
  assert.equal(refreshed.events.length, 43);
  assert.equal(new Set(refreshed.events.map((event) => event.id)).size, 43);
  assert.equal(refreshed.historyLoaded, true);
  assert.equal(refreshed.historyNextCursor, null);
  assert.ok(
    refreshed.events.find((event) => event.id === events[30].id).cancelled,
  );
  assert.equal(
    refreshed.events.find((event) => event.id === changed.id).responses[own.id],
    "yes",
  );
  assert.ok(
    Object.values(
      refreshed.events.find((event) => event.id === changed.id).responses,
    ).includes("maybe"),
  );
  const tail = await api.listEvents(summary.id, {
    cursor: refreshed.eventsNextCursor,
  });
  assert.equal(tail.items.length, 2);
  assert.ok(
    tail.items.every(
      (event) => !refreshed.events.some((old) => old.id === event.id),
    ),
  );
  assert.equal(tail.nextCursor, null);
  // Switching groups must never carry another group's history or events.
  const other = await api.createGroup("Another circle");
  const switched = await refreshGroupWindow(
    api,
    await api.getGroup(other.id),
    opened,
  );
  assert.deepEqual(switched.events, []);
  assert.equal(switched.historyLoaded, undefined);
  env.sqlite.close();
});

test("a refreshed group window retains opened pages and removes memberships that no longer exist", async () => {
  const env = environment();
  await register(env, tokens[0]);
  const api = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => tokens[0],
    fetcher: async (url, options) => handleAPI(new Request(url, options), env),
  });
  for (let index = 0; index < 25; index++)
    await api.createGroup("Group " + index);
  const read = () => api.listGroups({ limit: 20 });
  const opened = await readPageWindow(await read(), 40, (cursor) =>
    api.listGroups({ cursor }),
  );
  assert.equal(opened.items.length, 25);
  env.sqlite
    .prepare("DELETE FROM members WHERE group_id=?")
    .run(opened.items[22].id);
  const fresh = await readPageWindow(
    await read(),
    opened.items.length,
    (cursor) => api.listGroups({ cursor }),
  );
  assert.equal(fresh.items.length, 24);
  assert.equal(fresh.nextCursor, null);
  assert.ok(fresh.items.every((item) => item.id !== opened.items[22].id));
  env.sqlite.close();
});

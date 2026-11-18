import test from "node:test";
import assert from "node:assert/strict";
import { APIError, createApiClient } from "../src/lib/api.ts";

test("account auth and the Jcuki function share the selected Supabase project", async (context) => {
  const keys = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_API_URL"];
  const previous = keys.map((key) => process.env[key]);
  context.after(() => {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  });
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_API_URL;
  const hosted = await import("../src/auth/config.ts?hosted");
  assert.equal(
    hosted.API_URL,
    "https://chzyuktjcyrpbdwvdgsc.supabase.co/functions/v1/jcuki",
  );

  process.env.EXPO_PUBLIC_SUPABASE_URL = " https://other.supabase.co/ ";
  const project = await import("../src/auth/config.ts?project");
  assert.equal(project.SUPABASE_URL, "https://other.supabase.co/");
  assert.equal(project.API_URL, "https://other.supabase.co/functions/v1/jcuki");

  process.env.EXPO_PUBLIC_API_URL = " http://127.0.0.1:8787/ ";
  const local = await import("../src/auth/config.ts?local");
  assert.equal(local.API_URL, "http://127.0.0.1:8787/");
});

test("Supabase requests execute near the database without losing cursors, views, or mutation bodies", async (context) => {
  const previous = process.env.EXPO_PUBLIC_FUNCTION_REGION;
  delete process.env.EXPO_PUBLIC_FUNCTION_REGION;
  context.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_FUNCTION_REGION;
    else process.env.EXPO_PUBLIC_FUNCTION_REGION = previous;
  });
  const calls = [];
  const client = createApiClient({
    baseUrl: "https://chzyuktjcyrpbdwvdgsc.supabase.co/functions/v1/jcuki",
    getToken: async () => "a".repeat(64),
    fetcher: async (url, options) => {
      calls.push({ url: new URL(url), options });
      return Response.json({ items: [], nextCursor: null });
    },
  });
  await client.listEvents("circle", {
    cursor: "abc+def",
    limit: 20,
    view: "history",
  });
  await client.createGroup("Friends");
  assert.equal(
    calls[0].url.pathname,
    "/functions/v1/jcuki/api/groups/circle/events",
  );
  assert.equal(calls[0].url.searchParams.get("cursor"), "abc+def");
  assert.equal(calls[0].url.searchParams.get("view"), "history");
  for (const call of calls) {
    assert.equal(
      call.url.searchParams.get("forceFunctionRegion"),
      "ap-northeast-1",
    );
    assert.equal(
      call.options.headers.Authorization,
      "Bearer " + "a".repeat(64),
    );
  }
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: "Friends" });
  process.env.EXPO_PUBLIC_FUNCTION_REGION = "auto";
  await client.listGroups();
  assert.equal(calls[2].url.searchParams.has("forceFunctionRegion"), false);
});

test("client carries device identity and cursor and preserves server failures", async () => {
  const calls = [],
    token = "a".repeat(64);
  const client = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => token,
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ items: [], nextCursor: "next" }), {
        status: 200,
      });
    },
  });
  assert.deepEqual(await client.listGroups({ cursor: "abc+def", limit: 4 }), {
    items: [],
    nextCursor: "next",
  });
  assert.equal(calls[0].options.headers.Authorization, "Bearer " + token);
  assert.equal(
    calls[0].url,
    "https://api.jcuki.test/api/groups?cursor=abc%2Bdef&limit=4",
  );
  const blocked = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => token,
    fetcher: async () =>
      new Response('{"error":"NO_PERMISSION"}', { status: 403 }),
  });
  await assert.rejects(
    blocked.getGroup("group"),
    (error) =>
      error instanceof APIError &&
      error.status === 403 &&
      error.code === "NO_PERMISSION",
  );
});
test("network failures remain failures and are not replaced by a simulated cloud group", async () => {
  const client = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => "a".repeat(64),
    fetcher: async () => {
      throw new Error("Offline");
    },
  });
  await assert.rejects(
    client.listGroups(),
    (error) => error.code === "NETWORK_UNAVAILABLE",
  );
  const invalid = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => "nickname",
    fetcher: async () => {
      throw new Error("Should not be called");
    },
  });
  await assert.rejects(
    invalid.listGroups(),
    (error) => error.code === "IDENTITY_INVALID",
  );
});

test("malformed server bodies cannot be treated as successful reads or writes", async () => {
  const responses = [
    new Response("<html>service unavailable</html>", { status: 200 }),
    new Response("null", { status: 201 }),
    new Response("null", { status: 503 }),
  ];
  const client = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => "a".repeat(64),
    fetcher: async () => responses.shift(),
  });
  await assert.rejects(
    client.listGroups(),
    (error) => error.code === "INVALID_SERVER_RESPONSE" && error.status === 200,
  );
  await assert.rejects(
    client.createGroup("Friends"),
    (error) => error.code === "INVALID_SERVER_RESPONSE" && error.status === 201,
  );
  await assert.rejects(
    client.getProfile(),
    (error) => error.code === "SERVER_ERROR" && error.status === 503,
  );
});

test("the request deadline also covers a stalled response body", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let reading;
  const bodyStarted = new Promise((resolve) => {
    reading = resolve;
  });
  const client = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => "a".repeat(64),
    fetcher: async (_url, { signal }) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
          reading();
        }),
    }),
  });
  const result = client.listGroups();
  await bodyStarted;
  const rejected = assert.rejects(
    result,
    (error) => error.code === "NETWORK_TIMEOUT" && error.status === 0,
  );
  context.mock.timers.tick(15000);
  await rejected;
});
test("remote HTTP endpoints and embedded credentials are refused", () => {
  assert.throws(
    () =>
      createApiClient({
        baseUrl: "http://remote.example",
        getToken: async () => "",
      }),
    /API_HTTPS_REQUIRED/,
  );
  assert.throws(
    () =>
      createApiClient({
        baseUrl: "https://user:password@remote.example",
        getToken: async () => "",
      }),
    /API_BASE_URL_INVALID/,
  );
  assert.throws(
    () =>
      createApiClient({
        baseUrl: "https://remote.example/api",
        getToken: async () => "",
      }),
    /API_BASE_URL_INVALID/,
  );
  assert.equal(
    createApiClient({
      baseUrl: "http://10.0.2.2:8787",
      getToken: async () => "",
    }).baseUrl,
    "http://10.0.2.2:8787",
  );
});

test("an expired account token refreshes once before retrying a write, without duplicating the successful write", async () => {
  const refreshes = [],
    requests = [];
  let writes = 0;
  const client = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async (refresh) => {
      refreshes.push(refresh);
      return refresh ? "fresh.token.signature" : "expired.token.signature";
    },
    fetcher: async (_url, init) => {
      requests.push(init.headers.Authorization);
      if (init.headers.Authorization === "Bearer expired.token.signature")
        return new Response('{"error":"AUTH_REQUIRED"}', { status: 401 });
      writes++;
      return new Response('{"id":"created"}', { status: 201 });
    },
  });
  assert.equal((await client.createGroup("Circle")).id, "created");
  assert.equal(writes, 1);
  assert.deepEqual(refreshes, [false, true]);
  assert.deepEqual(requests, [
    "Bearer expired.token.signature",
    "Bearer fresh.token.signature",
  ]);
});
test("a missing account session stays an authentication error instead of being reported as an internet failure", async () => {
  let requests = 0;
  const client = createApiClient({
    baseUrl: "https://api.jcuki.test",
    getToken: async () => {
      throw new Error("AUTH_REQUIRED");
    },
    fetcher: async () => {
      requests++;
      return new Response("{}");
    },
  });
  await assert.rejects(
    client.getProfile(),
    (error) => error.code === "AUTH_REQUIRED" && error.status === 401,
  );
  assert.equal(requests, 0);
});

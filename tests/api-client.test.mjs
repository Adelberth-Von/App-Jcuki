import test from "node:test";
import assert from "node:assert/strict";
import { APIError, createApiClient } from "../src/lib/api.ts";

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

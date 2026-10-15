import test from "node:test";
import assert from "node:assert/strict";
import {
  createPrivateAvatarLoader,
  imageDataURL,
  avatarURL,
} from "../src/lib/privateAvatar.ts";
const base = "https://example.supabase.co/functions/v1/jcuki",
  url = base + "/api/avatars/" + "a".repeat(64) + "?v=one";
const image = new Uint8Array([255, 216, 255, 224, 0, 16, 1, 2, 3]);
const ok = () =>
  new Response(image, { headers: { "Content-Type": "image/jpeg" } });
test("private avatar fetch refreshes an expired token once, coalesces requests, and persists across loader restarts", async () => {
  const disk = new Map(),
    tokens = [],
    requests = [];
  const dependencies = {
    read: async (scope, uri) => disk.get(scope + uri) || null,
    write: async (scope, uri, bytes, mime) => {
      const value = imageDataURL(bytes, mime);
      disk.set(scope + uri, value);
      return value;
    },
    getToken: async (scope, refresh) => {
      tokens.push({ scope, refresh });
      return refresh ? "fresh" : "expired";
    },
    fetcher: async (uri, init) => {
      requests.push(init.headers.Authorization);
      return init.headers.Authorization === "Bearer expired"
        ? new Response("{}", { status: 401 })
        : ok();
    },
  };
  const loader = createPrivateAvatarLoader(dependencies);
  const [a, b] = await Promise.all([
    loader.load("account-a", url, base),
    loader.load("account-a", url, base),
  ]);
  assert.equal(a, b);
  assert.deepEqual(requests, ["Bearer expired", "Bearer fresh"]);
  assert.deepEqual(tokens, [
    { scope: "account-a", refresh: false },
    { scope: "account-a", refresh: true },
  ]);
  assert.equal(
    await createPrivateAvatarLoader({
      ...dependencies,
      getToken: async () => {
        throw new Error("offline");
      },
    }).load("account-a", url, base),
    a,
  );
  assert.equal(disk.has("account-b" + url), false);
});
test("an avatar failure can retry after refresh; failures never become permanent cached initials", async () => {
  let fail = true,
    calls = 0;
  const loader = createPrivateAvatarLoader({
    read: async () => null,
    write: async () => "file:///avatar.jpg",
    getToken: async () => "token",
    fetcher: async () => {
      calls++;
      if (fail) throw new TypeError("offline");
      return ok();
    },
  });
  await assert.rejects(loader.load("a", url, base));
  await new Promise((resolve) => setImmediate(resolve));
  fail = false;
  assert.equal(await loader.load("a", url, base), "file:///avatar.jpg");
  assert.equal(calls, 2);
});
test("avatar auth headers never go to foreign origins and invalid images are not cached", async () => {
  let calls = 0,
    writes = 0;
  const loader = createPrivateAvatarLoader({
    read: async () => null,
    write: async () => {
      writes++;
      return "file.jpg";
    },
    getToken: async () => "secret",
    fetcher: async () => {
      calls++;
      return new Response('{"error":"bad"}');
    },
  });
  assert.equal(
    avatarURL("https://attacker.example/api/avatars/" + "a".repeat(64), base),
    null,
  );
  await assert.rejects(
    loader.load(
      "a",
      "https://attacker.example/api/avatars/" + "a".repeat(64),
      base,
    ),
  );
  assert.equal(calls, 0);
  await assert.rejects(loader.load("a", url, base));
  assert.equal(writes, 0);
});
test("a successful avatar still displays if persistent cache is unavailable", async () => {
  const loader = createPrivateAvatarLoader({
    read: async () => {
      throw new Error("storage");
    },
    write: async () => {
      throw new Error("quota");
    },
    getToken: async () => "token",
    fetcher: async () => ok(),
  });
  assert.equal(
    await loader.load("a", url, base),
    "data:image/jpeg;base64," + Buffer.from(image).toString("base64"),
  );
});

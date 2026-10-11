import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";

// Exercise the real identity service with native storage/crypto boundaries replaced by memory.
// This catches profile-ID mismatches across app restarts without pretending to test Keychain itself.
globalThis.__jcukiIdentityTest = {
  secure: new Map(),
  async: new Map(),
  randomCalls: 0,
};
const sources = {
  "react-native": 'export const Platform = { OS: "android" };',
  "expo-secure-store": `export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
    export async function getItemAsync(key) { return globalThis.__jcukiIdentityTest.secure.get(key) ?? null; }
    export async function setItemAsync(key, value) { globalThis.__jcukiIdentityTest.secure.set(key, value); }
    export async function deleteItemAsync(key) { globalThis.__jcukiIdentityTest.secure.delete(key); }`,
  "@react-native-async-storage/async-storage": `export default {
    async getItem(key) { return globalThis.__jcukiIdentityTest.async.get(key) ?? null; },
    async setItem(key, value) { globalThis.__jcukiIdentityTest.async.set(key, value); },
    async removeItem(key) { globalThis.__jcukiIdentityTest.async.delete(key); }
  };`,
  "expo-crypto": `import { createHash, randomBytes } from 'node:crypto';
    export const CryptoDigestAlgorithm = { SHA256: 'sha256' };
    export async function digestStringAsync(algorithm, value) { return createHash(algorithm).update(value).digest('hex'); }
    export async function getRandomBytesAsync(count) { globalThis.__jcukiIdentityTest.randomCalls++; return new Uint8Array(randomBytes(count)); }`,
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return Object.hasOwn(sources, specifier)
      ? { url: `jcuki-mock:${specifier}`, shortCircuit: true }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    return url.startsWith("jcuki-mock:")
      ? {
          format: "module",
          source: sources[url.slice("jcuki-mock:".length)],
          shortCircuit: true,
        }
      : nextLoad(url, context);
  },
});
const identity = await import("../src/services/identity.ts");
after(() => {
  hooks.deregister();
  delete globalThis.__jcukiIdentityTest;
});

test("profile ID uses the complete backend SHA-256 digest for an existing device token", async () => {
  await identity.clearDeviceToken();
  const token = "a".repeat(64);
  globalThis.__jcukiIdentityTest.secure.set("jcuki.device-token.v1", token);
  const id = await identity.getDeviceUserId();
  assert.equal(id, createHash("sha256").update(token).digest("hex"));
  assert.equal(id.length, 64);
  assert.equal(globalThis.__jcukiIdentityTest.async.size, 0);
});

test("concurrent native identity reads create one token and persist it securely", async () => {
  await identity.clearDeviceToken();
  globalThis.__jcukiIdentityTest.randomCalls = 0;
  const tokens = await Promise.all(
    Array.from({ length: 20 }, () => identity.getOrCreateDeviceToken()),
  );
  assert.equal(new Set(tokens).size, 1);
  assert.match(tokens[0], /^[a-f0-9]{64}$/);
  assert.equal(globalThis.__jcukiIdentityTest.randomCalls, 1);
  assert.equal(
    globalThis.__jcukiIdentityTest.secure.get("jcuki.device-token.v1"),
    tokens[0],
  );
});

test("reloaded service keeps the same backend membership identity", async () => {
  const before = await identity.getDeviceUserId();
  const restarted = await import("../src/services/identity.ts?restart=1");
  const afterRestart = await restarted.getDeviceUserId();
  assert.equal(afterRestart, before);
  assert.equal(globalThis.__jcukiIdentityTest.randomCalls, 1);
});

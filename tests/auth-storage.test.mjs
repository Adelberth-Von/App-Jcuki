import test from "node:test";
import assert from "node:assert/strict";
import { secureSessionStorage } from "../src/auth/storage.ts";
import { validateAccount, accountError } from "../src/auth/validation.ts";
test("native session storage supports large sessions, restore, replacement, and logout", async () => {
  const values = new Map();
  const store = {
    getItemAsync: async (key) => values.get(key) || null,
    setItemAsync: async (key, value) => {
      assert.ok(Buffer.byteLength(value, "utf8") <= 1600);
      values.set(key, value);
    },
    deleteItemAsync: async (key) => {
      values.delete(key);
    },
  };
  const storage = secureSessionStorage(store),
    session = "x🌿".repeat(2500);
  await storage.setItem("session", session);
  assert.equal(await secureSessionStorage(store).getItem("session"), session);
  await storage.setItem("session", "next-token");
  assert.equal(await storage.getItem("session"), "next-token");
  assert.equal(values.size, 2);
  await storage.removeItem("session");
  assert.equal(values.size, 0);
  assert.equal(await storage.getItem("session"), null);
});
test("an interrupted secure storage write preserves the previous complete session", async () => {
  const values = new Map();
  let writes = 0,
    fail = false;
  const store = {
    getItemAsync: async (key) => values.get(key) || null,
    setItemAsync: async (key, value) => {
      if (fail && ++writes === 2) throw new Error("storage unavailable");
      values.set(key, value);
    },
    deleteItemAsync: async (key) => {
      values.delete(key);
    },
  };
  const storage = secureSessionStorage(store);
  await storage.setItem("session", "old-token");
  fail = true;
  await assert.rejects(storage.setItem("session", "x".repeat(4000)));
  assert.equal(await storage.getItem("session"), "old-token");
});
test("signup validates confirmation while login uses a generic credentials error", () => {
  const fields = {
    fullName: "Raka Example",
    nickname: "Raka",
    email: "raka@example.com",
    password: "safe-password",
    confirmPassword: "wrong",
  };
  assert.equal(
    validateAccount(fields, true).confirmPassword,
    "authPasswordMismatch",
  );
  assert.deepEqual(validateAccount(fields, false), {});
  assert.equal(
    accountError({ code: "invalid_credentials", status: 400 }),
    "authWrongCredentials",
  );
  assert.equal(
    accountError({ code: "EMAIL_EXISTS", status: 409 }),
    "authEmailExists",
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { environment, call, tokens, register } from "./helpers/backend.mjs";
import { accountAuthenticator } from "../backend/accounts.mjs";
import { registrationInput } from "../backend/registration.mjs";
const users = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "qa-a@example.com",
    email_confirmed_at: "2026-10-15T00:00:00Z",
    user_metadata: {
      full_name: "Raka Example",
      nickname: "Raka",
      zone: "Asia/Jakarta",
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "qa-b@example.com",
    email_confirmed_at: "2026-10-15T00:00:00Z",
    user_metadata: {
      full_name: "Nara Example",
      nickname: "Nara",
      zone: "Europe/Berlin",
    },
  },
];
const jwt = ["header.user-a.signature", "header.user-b.signature"];
test("a verified account claims its own legacy profile and recovers the same groups from another device", async () => {
  const env = environment();
  const old = await register(env, tokens[0]);
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "Our circle" })
  ).data;
  env.AUTHENTICATE = accountAuthenticator({
    db: env.DB,
    verifyUser: async (token) => users[jwt.indexOf(token)],
  });
  const own = await call(env, jwt[0], "/api/me", "GET", undefined, {
    "X-Jcuki-Device": tokens[0],
  });
  assert.equal(own.status, 200);
  assert.equal(own.data.id, old.id);
  assert.equal(own.data.fullName, "Raka Example");
  const restored = await call(env, jwt[0], "/api/groups", "GET", undefined, {
    "X-Jcuki-Device": tokens[2],
  });
  assert.equal(restored.data.items[0].id, group.id);
  assert.equal((await call(env, tokens[0], "/api/groups")).status, 401);
  const other = await call(env, jwt[1], "/api/me", "GET", undefined, {
    "X-Jcuki-Device": tokens[0],
  });
  assert.notEqual(other.data.id, old.id);
  assert.equal(
    (await call(env, jwt[1], "/api/groups/" + group.id)).status,
    403,
  );
  assert.equal((await call(env, "bad.token.signature", "/api/me")).status, 401);
  env.sqlite.close();
});
test("Auth metadata can never select another profile ID or grant group membership", async () => {
  const env = environment();
  const victim = await register(env, tokens[0]);
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", { name: "Private" })
  ).data;
  env.AUTHENTICATE = accountAuthenticator({
    db: env.DB,
    verifyUser: async () => ({
      ...users[1],
      user_metadata: {
        ...users[1].user_metadata,
        id: victim.id,
        auth_user_id: users[0].id,
        role: "admin",
      },
    }),
  });
  const profile = await call(env, jwt[1], "/api/me");
  assert.equal(profile.status, 200);
  assert.notEqual(profile.data.id, victim.id);
  assert.equal(
    (await call(env, jwt[1], "/api/groups/" + group.id)).status,
    403,
  );
  env.sqlite.close();
});
test("registration validates before admin access, confirms only the newly created user, and never stores confirmation password", async () => {
  const env = environment();
  let received,
    calls = 0;
  env.REGISTER_ACCOUNT = async (input) => {
    received = input;
    calls++;
    return { status: 201 };
  };
  const body = {
    fullName: "Raka Example",
    nickname: "Raka",
    email: " RAKA@example.com ",
    password: "private-test-password",
    confirmPassword: "private-test-password",
    zone: "Asia/Jakarta",
  };
  const response = await call(env, "", "/auth/register", "POST", body);
  assert.equal(response.status, 201);
  assert.equal(received.email, "raka@example.com");
  assert.equal(received.email_confirm, true);
  assert.equal(received.confirmPassword, undefined);
  assert.equal(received.user_metadata.full_name, body.fullName);
  assert.equal(
    (
      await call(env, "", "/auth/register", "POST", {
        ...body,
        confirmPassword: "different",
      })
    ).status,
    400,
  );
  assert.equal(calls, 1);
  env.REGISTER_ACCOUNT = async () => ({ error: "EMAIL_EXISTS", status: 409 });
  assert.equal(
    (await call(env, "", "/auth/register", "POST", body)).status,
    409,
  );
  env.sqlite.close();
});
test("invalid signup fields never reach the Auth admin API", () => {
  for (const patch of [
    { fullName: "" },
    { nickname: "a" },
    { email: "broken" },
    { password: "short" },
    { confirmPassword: "other" },
  ]) {
    assert.ok(
      registrationInput({
        fullName: "Raka Example",
        nickname: "Raka",
        email: "raka@example.com",
        password: "safe-password",
        confirmPassword: "safe-password",
        ...patch,
      }).error,
    );
  }
});

test("a competing legacy claim cannot return a profile when the conditional update loses", async () => {
  const env = environment();
  const old = await register(env, tokens[0]);
  const group = (
    await call(env, tokens[0], "/api/groups", "POST", {
      name: "Private circle",
    })
  ).data;
  const real = env.DB;
  const racingDB = {
    ...real,
    prepare(sql) {
      if (sql.startsWith("UPDATE profiles SET auth_user_id="))
        return {
          bind: () => ({
            first: async () => {
              env.sqlite
                .prepare("UPDATE profiles SET auth_user_id=? WHERE id=?")
                .run(users[1].id, old.id);
              return null;
            },
          }),
        };
      return real.prepare(sql);
    },
  };
  env.AUTHENTICATE = accountAuthenticator({
    db: racingDB,
    verifyUser: async () => users[0],
  });
  const own = await call(env, jwt[0], "/api/me", "GET", undefined, {
    "X-Jcuki-Device": tokens[0],
  });
  assert.equal(own.status, 200);
  assert.notEqual(own.data.id, old.id);
  assert.equal(
    (await call(env, jwt[0], "/api/groups/" + group.id)).status,
    403,
  );
  env.sqlite.close();
});

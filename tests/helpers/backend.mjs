import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleAPI } from "../../backend/index.mjs";
export function environment() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../../backend/migrations/0001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      new URL(
        "../../backend/migrations/0002_confirmed_days_off.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      new URL(
        "../../backend/migrations/0003_activity_push.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      new URL("../../backend/migrations/0004_accounts.sql", import.meta.url),
      "utf8",
    ),
  );
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            first: async () => sqlite.prepare(sql).get(...values) || null,
            all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
            run: async () => ({
              meta: { changes: sqlite.prepare(sql).run(...values).changes },
            }),
            _sql: sql,
            _values: values,
          };
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = statements.map((statement) => ({
          meta: sqlite.prepare(statement._sql).run(...statement._values),
        }));
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return {
    DB,
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    ALLOWED_ORIGINS: "http://localhost:8081",
    sqlite,
  };
}
export const tokens = ["a", "b", "c", "d"].map((letter) => letter.repeat(64));
export async function call(
  env,
  token,
  path,
  method = "GET",
  body,
  headers = {},
) {
  const response = await handleAPI(
    new Request("https://api.jcuki.test" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
  return {
    status: response.status,
    data: response.headers.get("Content-Type")?.includes("application/json")
      ? await response.json()
      : new Uint8Array(await response.arrayBuffer()),
  };
}
export async function register(env, token, index = 0) {
  return (
    await call(env, token, "/api/me", "PUT", {
      nickname: "Friend " + index,
      zone: ["Asia/Jakarta", "Europe/Berlin", "Asia/Jayapura"][index % 3],
    })
  ).data;
}
export const future = (minutes) =>
  new Date(Date.now() + minutes * 60000).toISOString();

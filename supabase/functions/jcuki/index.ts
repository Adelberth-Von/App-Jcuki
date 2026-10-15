import postgres from "npm:postgres@3.4.7";
import { handleAPI } from "../../../backend/index.mjs";
import { deliverPush } from "../../../backend/notifications.mjs";
import { postgresDatabase } from "./postgres.mjs";

const client = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: { search_path: "jcuki,public" },
});
const DB = postgresDatabase(client);
// Persistent limits work across cold starts and concurrent function instances.
const RATE_LIMITER = {
  async limit({ key }: { key: string }) {
    const bucket = Math.floor(Date.now() / 60000);
    const rows = await client`
      insert into jcuki.rate_limits(key,bucket,hits) values (${key},${bucket},1)
      on conflict (key) do update set bucket=excluded.bucket,
        hits=case when rate_limits.bucket=excluded.bucket then rate_limits.hits+1 else 1 end
      returning hits`;
    return {
      success: rows[0].hits <= (key.startsWith("registration:") ? 20 : 120),
    };
  },
};
Deno.serve(async (request) => {
  const url = new URL(request.url);
  const prefix = "/functions/v1/jcuki";
  url.pathname =
    url.pathname.replace(/^\/(?:functions\/v1\/)?jcuki(?=\/|$)/, "") || "/";
  const env = {
    DB,
    RATE_LIMITER,
    PUBLIC_API_URL: `${Deno.env.get("SUPABASE_URL")}${prefix}`,
    ALLOWED_ORIGINS: Deno.env.get("ALLOWED_ORIGINS") || "",
    PUSH_ENABLED: Deno.env.get("PUSH_ENABLED") || "false",
    EXPO_PUSH_ACCESS_TOKEN: Deno.env.get("EXPO_PUSH_ACCESS_TOKEN"),
  };
  if (url.pathname === "/maintenance") {
    const secret = Deno.env.get("CRON_SECRET");
    if (
      request.method !== "POST" ||
      !secret ||
      secret.length < 32 ||
      request.headers.get("Authorization") !== `Bearer ${secret}`
    )
      return Response.json({ error: "NO_PERMISSION" }, { status: 403 });
    await deliverPush(env);
    await client`delete from jcuki.rate_limits where bucket < ${Math.floor(Date.now() / 60000) - 1440}`;
    return Response.json({ ok: true });
  }
  const response = await handleAPI(new Request(url, request), env, {
    waitUntil: (promise: Promise<unknown>) => EdgeRuntime.waitUntil(promise),
  });
  return response;
});

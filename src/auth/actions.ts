import { supabase } from "./client";
import type { AccountFields } from "./validation";
import { getDeviceTimeZone } from "../services/preferences";
import { withFunctionRegion } from "../lib/functionRegion";
const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  "https://chzyuktjcyrpbdwvdgsc.supabase.co/functions/v1/jcuki";
export async function registerAccount(fields: AccountFields) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(
      withFunctionRegion(API_URL.replace(/\/+$/, "") + "/auth/register"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, zone: getDeviceTimeZone() }),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timer);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error("Account registration failed"), {
      code: body.error,
      status: response.status,
    });
  try {
    await loginAccount(fields.email, fields.password);
  } catch (cause) {
    throw Object.assign(new Error("Account created; login did not finish"), {
      code: "ACCOUNT_CREATED_LOGIN_FAILED",
      status: 409,
      cause,
    });
  }
}
export async function loginAccount(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

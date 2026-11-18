import { supabase } from "./client";
import { API_URL } from "./config";
import type { AccountFields } from "./validation";
import { getDeviceTimeZone } from "../services/preferences";
import { withFunctionRegion } from "../lib/functionRegion";
export async function registerAccount(fields: AccountFields) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  let body: { created?: boolean; error?: string } | null;
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
    body = await response.json().catch((error) => {
      if (controller.signal.aborted) throw error;
      return null;
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok || body?.created !== true)
    throw Object.assign(new Error("Account registration failed"), {
      code: body?.error,
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

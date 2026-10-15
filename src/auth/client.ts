import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { secureSessionStorage } from "./storage";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage:
      Platform.OS === "web" ? AsyncStorage : secureSessionStorage(SecureStore),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    lock: processLock,
  },
});
let refreshing: ReturnType<typeof supabase.auth.refreshSession> | null = null;
export async function accountAccessToken(
  force = false,
  expectedUserId?: string,
) {
  if (force && !refreshing) {
    refreshing = supabase.auth.refreshSession();
    void refreshing
      .finally(() => {
        refreshing = null;
      })
      .catch(() => {});
  }
  const { data, error } = force
    ? await refreshing!
    : await supabase.auth.getSession();
  if (
    error ||
    !data.session ||
    (expectedUserId && data.session.user.id !== expectedUserId)
  )
    throw new Error("AUTH_REQUIRED");
  return data.session.access_token;
}

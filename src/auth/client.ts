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
export async function accountAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("AUTH_REQUIRED");
  return data.session.access_token;
}

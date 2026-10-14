import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { APIClient } from "../lib/api";
import type { AppPreferences } from "./preferences";
import {
  getNotificationPermission,
  initializeNotifications,
} from "./notifications";
export type PushStatus =
  "off" | "permission" | "setup" | "ready" | "server" | "error";
let pending: Promise<unknown> = Promise.resolve();
export function registerActivityPush(
  api: APIClient,
  prefs: AppPreferences,
  zone: string,
): Promise<PushStatus> {
  // Keep the latest opt-out after any in-flight registration or preference change.
  const next = pending.catch(() => {}).then(() => register(api, prefs, zone));
  pending = next;
  return next;
}
async function register(
  api: APIClient,
  prefs: AppPreferences,
  zone: string,
): Promise<PushStatus> {
  if (!prefs.activityNotifications || Platform.OS === "web") {
    await api.unregisterPushDevice();
    return "off";
  }
  await initializeNotifications(prefs.language);
  if (!(await getNotificationPermission())) {
    await api.unregisterPushDevice();
    return "permission";
  }
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return "setup";
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const result = await api.registerPushDevice({
    token,
    language: prefs.language,
    sound: prefs.notificationSound,
    zone,
  });
  return result.deliveryEnabled ? "ready" : "server";
}

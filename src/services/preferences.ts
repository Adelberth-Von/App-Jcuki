import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCalendars, getLocales } from "expo-localization";

export type AppLanguage = "id" | "en";
export type AppTheme = "system" | "light" | "dark";
export type TimeFormat = "24h" | "12h";

export interface WeeklyReminderPreferences {
  enabled: boolean;
  /** Expo weekday convention: 1 = Sunday, 2 = Monday, …, 7 = Saturday. */
  weekday: number;
  hour: number;
  minute: number;
}

export interface AppPreferences {
  language: AppLanguage;
  theme: AppTheme;
  /** 'auto' follows the device. Always use an IANA zone rather than a fixed UTC offset. */
  timeZone: string;
  timeFormat: TimeFormat;
  weeklyReminder: WeeklyReminderPreferences;
  eventReminderMinutes: number;
  notificationSound: boolean;
  activityNotifications: boolean;
}

export const PREFERENCES_STORAGE_KEY = "@jcuki/preferences/v1";

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getDeviceTimeZone(): string {
  const detected =
    getCalendars()[0]?.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  return detected && isValidTimeZone(detected) ? detected : "UTC";
}

export function getEffectiveTimeZone(
  preferences: Pick<AppPreferences, "timeZone">,
): string {
  return preferences.timeZone === "auto" ||
    !isValidTimeZone(preferences.timeZone)
    ? getDeviceTimeZone()
    : preferences.timeZone;
}

export function getDefaultPreferences(): AppPreferences {
  return {
    language: getLocales()[0]?.languageCode === "id" ? "id" : "en",
    theme: "system",
    timeZone: "auto",
    timeFormat: getCalendars()[0]?.uses24hourClock === false ? "12h" : "24h",
    weeklyReminder: { enabled: false, weekday: 1, hour: 19, minute: 0 },
    eventReminderMinutes: 15,
    notificationSound: true,
    activityNotifications: false,
  };
}

function integerInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : fallback;
}

/** Validate persisted values so a partial upgrade or corrupted preference cannot break startup. */
export function normalizePreferences(
  value: unknown,
  defaults = getDefaultPreferences(),
): AppPreferences {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<AppPreferences>)
      : {};
  const weekly =
    raw.weeklyReminder && typeof raw.weeklyReminder === "object"
      ? raw.weeklyReminder
      : ({} as Partial<WeeklyReminderPreferences>);
  return {
    language:
      raw.language === "id" || raw.language === "en"
        ? raw.language
        : defaults.language,
    theme:
      raw.theme === "light" || raw.theme === "dark" || raw.theme === "system"
        ? raw.theme
        : defaults.theme,
    timeZone:
      typeof raw.timeZone === "string" &&
      (raw.timeZone === "auto" || isValidTimeZone(raw.timeZone))
        ? raw.timeZone
        : defaults.timeZone,
    timeFormat:
      raw.timeFormat === "12h" || raw.timeFormat === "24h"
        ? raw.timeFormat
        : defaults.timeFormat,
    weeklyReminder: {
      enabled:
        typeof weekly.enabled === "boolean"
          ? weekly.enabled
          : defaults.weeklyReminder.enabled,
      weekday: integerInRange(
        weekly.weekday,
        1,
        7,
        defaults.weeklyReminder.weekday,
      ),
      hour: integerInRange(weekly.hour, 0, 23, defaults.weeklyReminder.hour),
      minute: integerInRange(
        weekly.minute,
        0,
        59,
        defaults.weeklyReminder.minute,
      ),
    },
    eventReminderMinutes: integerInRange(
      raw.eventReminderMinutes,
      0,
      1440,
      defaults.eventReminderMinutes,
    ),
    activityNotifications:
      typeof raw.activityNotifications === "boolean"
        ? raw.activityNotifications
        : defaults.activityNotifications,
    notificationSound:
      typeof raw.notificationSound === "boolean"
        ? raw.notificationSound
        : defaults.notificationSound,
  };
}

export async function loadPreferences(): Promise<AppPreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (!raw) return getDefaultPreferences();
  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return getDefaultPreferences();
  }
}

export async function savePreferences(
  preferences: AppPreferences,
): Promise<void> {
  await AsyncStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizePreferences(preferences)),
  );
}

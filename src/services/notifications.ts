import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  getEffectiveTimeZone,
  normalizePreferences,
  type AppLanguage,
  type AppPreferences,
} from "./preferences";
import { planWeeklyDates } from "./notificationPlan";

export const JCuki_NOTIFICATION_SOUND = "jcuki_chime.wav";
export const JCuki_SOUND_CHANNEL = "jcuki-reminders-v1";
export const JCuki_SILENT_CHANNEL = "jcuki-reminders-silent-v1";
const WEEKLY_PREFIX = "jcuki-weekly-";
const EVENT_PREFIX = "jcuki-event-";
let nativeQueue: Promise<unknown> = Promise.resolve();

export interface ReminderEvent {
  id: string;
  title: string;
  start: string;
  groupId?: string;
  groupName?: string;
  /** Pass only accepted events, or explicitly set false for pending proposals. */
  confirmed?: boolean;
  cancelled?: boolean;
}

export interface NotificationScheduleResult {
  supported: boolean;
  permissionGranted: boolean;
  scheduled: number;
  /** Explicit-zone reminders on Android have a rolling 12-week horizon. */
  refreshBefore?: string;
}

function serialize<T>(job: () => Promise<T>): Promise<T> {
  const next = nativeQueue.then(job, job);
  nativeQueue = next.catch(() => undefined);
  return next;
}

function permissionAllowsNotifications(
  status: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS === "ios") {
    return (
      status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }
  return status.granted;
}

function channelId(preferences: AppPreferences) {
  return preferences.notificationSound
    ? JCuki_SOUND_CHANNEL
    : JCuki_SILENT_CHANNEL;
}

export async function initializeNotifications(
  language: AppLanguage = "en",
): Promise<void> {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound:
        notification.request.content.data?.soundEnabled !== false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(JCuki_SOUND_CHANNEL, {
      name: language === "id" ? "Pengingat JCuki" : "JCuki reminders",
      description:
        language === "id"
          ? "Pengingat jadwal dengan JCuki Chime"
          : "Schedule reminders with JCuki Chime",
      importance: Notifications.AndroidImportance.HIGH,
      sound: JCuki_NOTIFICATION_SOUND,
      vibrationPattern: [0, 70, 90, 70],
      lightColor: "#B8DF59",
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
    await Notifications.setNotificationChannelAsync(JCuki_SILENT_CHANNEL, {
      name: language === "id" ? "Pengingat senyap" : "Silent reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      enableVibrate: false,
    });
  }
}

/** Request only after an explicit user action, rather than during onboarding or startup. */
export async function requestNotificationPermission(
  language: AppLanguage = "en",
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await initializeNotifications(language);
  let status = await Notifications.getPermissionsAsync();
  if (!permissionAllowsNotifications(status) && status.canAskAgain) {
    status = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
  }
  return permissionAllowsNotifications(status);
}

export async function getNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return permissionAllowsNotifications(
    await Notifications.getPermissionsAsync(),
  );
}

async function cancelPrefix(prefix: string): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((item) => item.identifier.startsWith(prefix))
      .map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier),
      ),
  );
}

function content(
  preferences: AppPreferences,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Notifications.NotificationContentInput {
  return {
    title,
    body,
    sound: preferences.notificationSound ? JCuki_NOTIFICATION_SOUND : false,
    data: { ...data, soundEnabled: preferences.notificationSound },
  };
}

/** Refresh on foreground/settings changes. This method never opens a permission prompt. */
export function setWeeklyReminder(
  input: AppPreferences,
): Promise<NotificationScheduleResult> {
  return serialize(async () => {
    if (Platform.OS === "web")
      return { supported: false, permissionGranted: false, scheduled: 0 };
    const preferences = normalizePreferences(input);
    await initializeNotifications(preferences.language);
    const granted = await getNotificationPermission();
    if (!preferences.weeklyReminder.enabled || !granted) {
      await cancelPrefix(WEEKLY_PREFIX);
      return { supported: true, permissionGranted: granted, scheduled: 0 };
    }
    const weekly = preferences.weeklyReminder;
    const id = preferences.language === "id";
    const notification = content(
      preferences,
      id ? "Waktunya menyusun minggu ini" : "Confirm this week’s days off",
      id
        ? "Konfirmasi tanggal liburmu di kalender JCuki. Tambahkan jam bermain jika sudah tahu."
        : "Confirm your days off in the JCuki calendar. Add playing hours when you know.",
      { screen: "/(tabs)/calendar", kind: "weekly" },
    );
    const zone = getEffectiveTimeZone(preferences);
    const dates =
      Platform.OS === "android" && preferences.timeZone !== "auto"
        ? planWeeklyDates(weekly, zone)
        : [];
    await cancelPrefix(WEEKLY_PREFIX);
    if (dates.length) {
      for (const date of dates) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${WEEKLY_PREFIX}${date.getTime()}`,
          content: notification,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: channelId(preferences),
          },
        });
      }
      return {
        supported: true,
        permissionGranted: true,
        scheduled: dates.length,
        refreshBefore: dates[dates.length - 1].toISOString(),
      };
    }
    const trigger: Notifications.NotificationTriggerInput =
      Platform.OS === "ios" && preferences.timeZone !== "auto"
        ? {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: weekly.weekday,
            hour: weekly.hour,
            minute: weekly.minute,
            second: 0,
            timezone: zone,
            repeats: true,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekly.weekday,
            hour: weekly.hour,
            minute: weekly.minute,
            channelId: channelId(preferences),
          };
    await Notifications.scheduleNotificationAsync({
      identifier: `${WEEKLY_PREFIX}recurring`,
      content: notification,
      trigger,
    });
    return { supported: true, permissionGranted: true, scheduled: 1 };
  });
}

/** Call after sync/RSVP changes with events that this member has accepted. UTC event instants remain unchanged by locale. */
export function syncEventReminders(
  events: ReminderEvent[],
  input: AppPreferences,
): Promise<NotificationScheduleResult> {
  return serialize(async () => {
    if (Platform.OS === "web")
      return { supported: false, permissionGranted: false, scheduled: 0 };
    const preferences = normalizePreferences(input);
    await initializeNotifications(preferences.language);
    const granted = await getNotificationPermission();
    const now = Date.now();
    const upcoming = events
      .filter((event) => !event.cancelled && event.confirmed !== false)
      .map((event) => ({
        event,
        at: Date.parse(event.start) - preferences.eventReminderMinutes * 60000,
      }))
      .filter((item) => Number.isFinite(item.at) && item.at > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, 32);
    await cancelPrefix(EVENT_PREFIX);
    if (!granted)
      return { supported: true, permissionGranted: false, scheduled: 0 };
    for (const { event, at } of upcoming) {
      const time = new Intl.DateTimeFormat(
        preferences.language === "id" ? "id-ID" : "en-GB",
        {
          timeZone: getEffectiveTimeZone(preferences),
          hour: "2-digit",
          minute: "2-digit",
          hour12: preferences.timeFormat === "12h",
        },
      ).format(new Date(event.start));
      const body =
        preferences.language === "id"
          ? `${event.groupName ?? "Temanmu"} menunggumu. Mulai pukul ${time}.`
          : `${event.groupName ?? "Your people"} are waiting. Starts at ${time}.`;
      await Notifications.scheduleNotificationAsync({
        identifier: `${EVENT_PREFIX}${event.id}`,
        content: content(preferences, event.title, body, {
          screen: "/(tabs)",
          kind: "event",
          eventId: event.id,
          groupId: event.groupId ?? "",
        }),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at),
          channelId: channelId(preferences),
        },
      });
    }
    return {
      supported: true,
      permissionGranted: true,
      scheduled: upcoming.length,
    };
  });
}

/** A real OS notification delivered five seconds later, also useful for checking the bundled sound. */
export async function sendTestNotification(
  input: AppPreferences,
): Promise<boolean> {
  const preferences = normalizePreferences(input);
  if (!(await requestNotificationPermission(preferences.language)))
    return false;
  await Notifications.scheduleNotificationAsync({
    identifier: "jcuki-test",
    content: content(
      preferences,
      "JCuki Chime",
      preferences.language === "id"
        ? "Suara kecil untuk waktu bersama."
        : "A little sound for time together.",
      { screen: "/(tabs)/settings", kind: "test" },
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      channelId: channelId(preferences),
    },
  });
  return true;
}

export function cancelJCukiNotifications(): Promise<void> {
  return serialize(async () => {
    if (Platform.OS === "web") return;
    await cancelPrefix("jcuki-");
  });
}

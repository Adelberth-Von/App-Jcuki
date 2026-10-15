import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { APIClient } from "../lib/api";
import type { Activity, Group } from "../lib/types";
import type { AppPreferences } from "../services/preferences";
import { activityKey, demoActivity, mergeActivity } from "../lib/activity";
import { notifyActivity } from "../services/notifications";
import { registerActivityPush, type PushStatus } from "../services/push";
import * as Notifications from "expo-notifications";

type Feed = {
  groupId: string;
  items: Activity[];
  cursor: string | null;
  readKey: string;
  loading: boolean;
  error: boolean;
};
const empty: Feed = {
  groupId: "",
  items: [],
  cursor: null,
  readKey: "",
  loading: false,
  error: false,
};
export function useActivity({
  api,
  group,
  profileId,
  demoMode,
  prefs,
  zone,
  onChange,
}: {
  api: APIClient | null;
  group: Group | null;
  profileId: string;
  demoMode: boolean;
  prefs: AppPreferences;
  zone: string;
  onChange: () => Promise<void>;
}) {
  const [feed, setFeed] = useState<Feed>(empty);
  const [pushStatus, setPushStatus] = useState<PushStatus>("off");
  const latest = useRef({
    api,
    group,
    profileId,
    prefs,
    zone,
    onChange,
    pushStatus,
    feed,
  });
  useEffect(() => {
    latest.current = {
      api,
      group,
      profileId,
      prefs,
      zone,
      onChange,
      pushStatus,
      feed,
    };
  }, [api, group, profileId, prefs, zone, onChange, pushStatus, feed]);
  const epoch = useRef(0);
  const reload = useRef<() => Promise<void>>(async () => {});
  const refreshActivity = useCallback(() => reload.current(), []);
  const [demoClock] = useState(() => Date.now());
  useEffect(() => {
    if (!api || demoMode || !profileId || profileId === "local") return;
    let live = true;
    let syncing = false;
    function sync() {
      if (!live || syncing) return;
      syncing = true;
      void registerActivityPush(api!, latest.current.prefs, zone)
        .then((status) => {
          if (live) setPushStatus(status);
        })
        .catch(() => {
          if (live) setPushStatus("error");
        })
        .finally(() => {
          syncing = false;
        });
    }
    sync();
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    const token =
      Platform.OS !== "web"
        ? Notifications.addPushTokenListener(sync)
        : undefined;
    const retry = setInterval(() => {
      if (
        AppState.currentState === "active" &&
        latest.current.pushStatus === "error"
      )
        sync();
    }, 120000);
    return () => {
      live = false;
      foreground.remove();
      token?.remove();
      clearInterval(retry);
    };
  }, [
    api,
    demoMode,
    profileId,
    prefs.activityNotifications,
    prefs.language,
    prefs.notificationSound,
    zone,
  ]);
  const groupId = group?.id || "";
  useEffect(() => {
    const ticket = ++epoch.current;
    if (!groupId) return;
    const storage = `@jcuki/activity-read/${profileId}/${groupId}`;
    let running = false,
      baseline: string | undefined;
    let readKey = "";
    async function load() {
      if (
        running ||
        ticket !== epoch.current ||
        (AppState.currentState !== "active" && Platform.OS !== "web")
      )
        return;
      running = true;
      try {
        const info = latest.current;
        const stored =
          baseline === undefined ? await AsyncStorage.getItem(storage) : null;
        const page = demoMode
          ? {
              items: demoActivity(info.group!, demoClock),
              nextCursor: null,
            }
          : await info.api!.listActivity(groupId, { limit: 20 });
        if (ticket !== epoch.current) return;
        const newest = page.items[0] ? activityKey(page.items[0]) : "";
        if (baseline === undefined) {
          readKey = stored || newest;
          baseline = newest;
          if (!stored) await AsyncStorage.setItem(storage, readKey);
        } else if (newest !== baseline) {
          const incoming = page.items.filter(
            (item) =>
              activityKey(item) > baseline! && item.actorId !== info.profileId,
          );
          baseline = newest;
          if (
            incoming.length &&
            info.prefs.activityNotifications &&
            info.pushStatus !== "ready"
          )
            void notifyActivity(incoming[0], info.prefs).catch(() => {});
        }
        setFeed((current) => {
          const next = {
            groupId,
            items: mergeActivity(
              current.groupId === groupId ? current.items : [],
              page.items,
            ),
            cursor:
              current.groupId === groupId && current.items.length > 20
                ? current.cursor
                : page.nextCursor,
            readKey: current.groupId === groupId ? current.readKey : readKey,
            loading: false,
            error: false,
          };
          return JSON.stringify(current) === JSON.stringify(next)
            ? current
            : next;
        });
        // A previous refresh can have been superseded by a write. Polling keeps
        // the selected group's schedule current even when its feed is unchanged.
        if (!demoMode) void info.onChange().catch(() => {});
      } catch {
        if (ticket === epoch.current)
          setFeed((current) =>
            current.groupId === groupId
              ? { ...current, error: true, loading: false }
              : { ...empty, groupId, error: true },
          );
      } finally {
        running = false;
      }
    }
    reload.current = load;
    if (demoMode || api) void load();
    const interval = demoMode
      ? undefined
      : setInterval(() => void load(), 30000);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    const notification =
      Platform.OS !== "web"
        ? Notifications.addNotificationReceivedListener((message) => {
            if (message.request.content.data?.groupId === groupId) {
              void load();
              void latest.current.onChange().catch(() => {});
            }
          })
        : undefined;
    return () => {
      epoch.current = ticket + 1;
      reload.current = async () => {};
      clearInterval(interval);
      foreground.remove();
      notification?.remove();
    };
  }, [api, groupId, profileId, demoMode, demoClock]);
  const visible = group && feed.groupId === group.id ? feed : empty;
  const markRead = useCallback(() => {
    const current = latest.current;
    if (!current.group || current.feed.groupId !== current.group.id) return;
    const key = current.feed.items[0]
      ? activityKey(current.feed.items[0])
      : current.feed.readKey;
    void AsyncStorage.setItem(
      `@jcuki/activity-read/${current.profileId}/${current.group.id}`,
      key,
    ).catch(() => {});
    setFeed((old) =>
      old.groupId === current.group!.id && old.readKey !== key
        ? { ...old, readKey: key }
        : old,
    );
  }, []);
  async function loadMore() {
    const current = latest.current,
      ticket = epoch.current;
    if (!current.api || !current.group || !visible.cursor || visible.loading)
      return;
    setFeed((old) => ({ ...old, loading: true }));
    try {
      const page = await current.api.listActivity(current.group.id, {
        limit: 20,
        cursor: visible.cursor,
      });
      if (ticket === epoch.current)
        setFeed((old) => ({
          ...old,
          items: mergeActivity(old.items, page.items),
          cursor: page.nextCursor,
          loading: false,
        }));
    } catch {
      if (ticket === epoch.current)
        setFeed((old) => ({ ...old, loading: false, error: true }));
    }
  }
  return {
    activities: visible.items,
    activityUnread: visible.items.filter(
      (item) =>
        item.actorId !== profileId && activityKey(item) > visible.readKey,
    ).length,
    activityMore: !!visible.cursor,
    activityLoading: visible.loading,
    activityError: visible.error,
    loadMoreActivity: loadMore,
    refreshActivity,
    markActivityRead: markRead,
    pushStatus:
      demoMode || !prefs.activityNotifications ? ("off" as const) : pushStatus,
  };
}

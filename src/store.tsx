import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createApiClient, type APIClient, APIError } from "./lib/api";
import { createDemoGroups } from "./lib/demo";
import {
  confirmLocalDay,
  eventState,
  formatDate,
  formatTime,
  localDate,
  removeConfirmedDay,
} from "./lib/domain";
import {
  createOperationGate,
  reconcileOwnProfile,
  resolveWorkspaceMode,
} from "./lib/storeState";
import type {
  Availability,
  AvailabilityStatus,
  Event,
  EventInput,
  Group,
  GroupSummary,
  Profile,
} from "./lib/types";
import {
  getDefaultPreferences,
  getEffectiveTimeZone,
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from "./services/preferences";
import { getDeviceUserId, getOrCreateDeviceToken } from "./services/identity";
import {
  getProfilePhoto,
  getProfilePhotoUpload,
  pickProfilePhoto,
  removeProfilePhoto,
} from "./services/profilePhoto";
import {
  initializeNotifications,
  setWeeklyReminder,
  syncEventReminders,
  type ReminderEvent,
} from "./services/notifications";
import { lightColors, darkColors, type Colors } from "./theme";
import { translate } from "./i18n";
export type Overlay =
  | { kind: "slot"; slot?: Availability; day?: string }
  | { kind: "dayOff"; day: string }
  | { kind: "event"; start?: string; duration?: number }
  | { kind: "details"; id: string }
  | { kind: "createGroup" }
  | { kind: "joinGroup" }
  | { kind: "invite" }
  | { kind: "zone" }
  | {
      kind: "choice";
      title: string;
      choices: { label: string; value: string }[];
      value: string;
      onSelect: (v: string) => void;
    }
  | { kind: "connection" }
  | {
      kind: "confirm";
      title: string;
      description: string;
      onConfirm: () => Promise<void>;
    };
interface AppContextValue {
  ready: boolean;
  onboarded: boolean;
  prefs: AppPreferences;
  profile: Profile;
  colors: Colors;
  dark: boolean;
  zone: string;
  groups: GroupSummary[];
  group: Group | null;
  demoMode: boolean;
  busy: boolean;
  refreshing: boolean;
  offline: boolean;
  apiUrl: string;
  imageHeaders: Record<string, string>;
  overlay: Overlay | null;
  setOverlay: (v: Overlay | null) => void;
  message: string;
  notify: (key: string, raw?: boolean) => void;
  t: (key: string) => string;
  time: (instant: string | number, z?: string) => string;
  date: (instant: string | number, opts?: Intl.DateTimeFormatOptions) => string;
  updatePrefs: (v: Partial<AppPreferences>) => Promise<void>;
  saveProfile: (nickname: string) => Promise<void>;
  enterDemo: () => Promise<void>;
  choosePhoto: () => Promise<void>;
  deletePhoto: () => Promise<void>;
  refresh: () => Promise<void>;
  switchGroup: (id: string) => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (code: string) => Promise<void>;
  saveAvailability: (slot: Availability, replaceId?: string) => Promise<void>;
  deleteAvailability: (id: string) => Promise<void>;
  confirmDayOff: (day: string) => Promise<void>;
  removeDayOff: (day: string) => Promise<void>;
  createEvent: (input: EventInput) => Promise<void>;
  respond: (id: string, status: AvailabilityStatus) => Promise<void>;
  cancelEvent: (id: string) => Promise<void>;
  loadMoreEvents: () => Promise<void>;
  loadHistory: () => Promise<void>;
  loadMoreGroups: () => Promise<void>;
  moreGroups: boolean;
  connect: (url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  widgetEnabled: boolean;
  setWidgetEnabled: (enabled: boolean) => void;
}
const Context = createContext<AppContextValue | null>(null),
  STORE = "@jcuki/app/v2";
const defaultProfile: Profile = { id: "local", nickname: "", zone: "UTC" };
const environmentApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || "";
const errors: Record<string, string> = {
  DST_GAP: "dstGap",
  DST_AMBIGUOUS: "dstAmbiguous",
  INVALID_DATE: "invalidInput",
  INVALID_TIME: "invalidInput",
  GROUP_NOT_FOUND: "notFound",
  NOT_FOUND: "notFound",
  NO_PERMISSION: "noPermission",
  GROUP_FULL: "full",
  GROUP_LIMIT: "full",
  NETWORK_UNAVAILABLE: "offline",
  NETWORK_TIMEOUT: "offline",
  API_HTTPS_REQUIRED: "apiInvalid",
  API_BASE_URL_INVALID: "apiInvalid",
  API_NOT_CONNECTED: "apiEmpty",
  CLOUD_REQUIRED: "apiEmpty",
  BACKEND_NOT_CONFIGURED: "apiEmpty",
  INVALID_NICKNAME: "invalidNickname",
  INVALID_ZONE: "invalidInput",
  INVALID_RANGE: "invalidRange",
  EVENT_IN_PAST: "pastTime",
  INVALID_AVAILABILITY: "invalidInput",
  INVALID_DAY_OFF: "invalidInput",
  DAY_OFF_REQUIRED: "dayOffRequired",
  INVALID_GROUP_NAME: "invalidInput",
  INVALID_EVENT_TITLE: "invalidInput",
  INVALID_MINIMUM: "invalidInput",
  INVALID_PAGE: "invalidInput",
  INVALID_CURSOR: "invalidInput",
  INVALID_RESPONSE: "invalidInput",
  IDENTITY_REQUIRED: "reconnect",
  IDENTITY_INVALID: "reconnect",
  PROFILE_REQUIRED: "reconnect",
  ORIGIN_NOT_ALLOWED: "noPermission",
  INVALID_IMAGE: "photoError",
  IMAGE_TOO_LARGE: "photoError",
  PROFILE_PHOTO_INVALID: "photoError",
  PROFILE_PHOTO_TOO_LARGE: "photoError",
  PROFILE_PHOTO_MISSING: "photoError",
  invalidNickname: "invalidNickname",
  invalidRange: "invalidRange",
  pastTime: "pastTime",
  overlap: "overlap",
};
type SavedApp = {
  onboarded?: boolean;
  profile?: Partial<Profile>;
  apiUrl?: string;
  demoMode?: boolean;
  widgetEnabled?: boolean;
  demoGroups?: Group[];
  groups?: GroupSummary[];
  activeGroup?: string;
  cachedGroup?: Group;
  pendingPhotoUri?: string;
  reminderEvents?: ReminderEvent[];
};
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [onboarded, setOnboarded] = useState(false);
  const [prefs, setPrefs] = useState(getDefaultPreferences),
    [profile, setProfile] = useState(defaultProfile);
  const [demoMode, setDemoMode] = useState(!environmentApiUrl),
    [apiUrl, setApiUrl] = useState(environmentApiUrl);
  const [groups, setGroups] = useState<GroupSummary[]>([]),
    [group, setGroup] = useState<Group | null>(null),
    [demoGroups, setDemoGroups] = useState<Group[]>([]);
  const [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [offline, setOffline] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null),
    [message, setMessage] = useState("");
  const [imageHeaders, setImageHeaders] = useState<Record<string, string>>({}),
    [widgetEnabled, setWidgetEnabled] = useState(true);
  const [groupsCursor, setGroupsCursor] = useState<string | null>(null),
    [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [reminderEvents, setReminderEvents] = useState<ReminderEvent[]>([]);
  const scheme = useColorScheme(),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gate = useRef(createOperationGate()),
    mounted = useRef(true),
    refreshingTask = useRef<{ ticket: number; promise: Promise<void> } | null>(
      null,
    );
  const persistence = useRef<Promise<void>>(Promise.resolve());
  const zone = getEffectiveTimeZone(prefs),
    dark =
      prefs.theme === "dark" || (prefs.theme === "system" && scheme === "dark"),
    colors = dark ? darkColors : lightColors;
  const t = useCallback(
    (key: string) => translate(prefs.language, key),
    [prefs.language],
  );
  const notify = useCallback(
    (key: string, raw = false) => {
      setMessage(raw ? key : t(key));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(""), 5000);
    },
    [t],
  );
  const api = useMemo<APIClient | null>(() => {
    if (!apiUrl) return null;
    try {
      return createApiClient({
        baseUrl: apiUrl,
        getToken: getOrCreateDeviceToken,
      });
    } catch {
      return null;
    }
  }, [apiUrl]);
  const time = useCallback(
    (instant: string | number, selectedZone = zone) =>
      formatTime(
        instant,
        selectedZone,
        prefs.language,
        prefs.timeFormat === "24h",
      ),
    [zone, prefs.language, prefs.timeFormat],
  );
  const date = useCallback(
    (instant: string | number, options: Intl.DateTimeFormatOptions = {}) =>
      formatDate(instant, zone, prefs.language, options),
    [zone, prefs.language],
  );
  function reportError(error: unknown) {
    const code = error instanceof Error ? error.message : "SERVER_ERROR";
    if (code === "BUSY") return;
    setOffline(error instanceof APIError && error.status === 0);
    if (code === "RATE_LIMITED")
      notify(
        prefs.language === "id"
          ? "Terlalu banyak permintaan. Coba lagi dalam satu menit."
          : "Too many requests. Try again in a minute.",
        true,
      );
    else if (code === "EVENT_CLOSED")
      notify(
        prefs.language === "id"
          ? "Rencana sudah ditutup. Perbarui jadwal untuk melihat status terbaru."
          : "This plan is closed. Refresh to see its latest status.",
        true,
      );
    else notify(errors[code] || "error");
  }
  function requireApi(): APIClient {
    if (!api) {
      setOverlay({ kind: "connection" });
      throw new Error("API_NOT_CONNECTED");
    }
    return api;
  }
  async function run<T>(job: () => Promise<T>): Promise<T> {
    const ticket = gate.current.startMutation();
    if (ticket === null) throw new Error("BUSY");
    setBusy(true);
    setRefreshing(false);
    try {
      const result = await job();
      if (mounted.current) setOffline(false);
      return result;
    } catch (error) {
      if (mounted.current) reportError(error);
      throw error;
    } finally {
      gate.current.finishMutation();
      if (mounted.current) setBusy(false);
    }
  }
  function applyOwnProfile(next: Profile) {
    const previousId = profile.id;
    setProfile(next);
    setDemoGroups((list) =>
      list.map((item) => reconcileOwnProfile(item, previousId, next)),
    );
    setGroup((current) =>
      current ? reconcileOwnProfile(current, previousId, next) : null,
    );
  }
  const replaceGroup = useCallback(
    (next: Group) => {
      setGroup(next);
      if (demoMode)
        setDemoGroups((list) =>
          list.map((item) => (item.id === next.id ? next : item)),
        );
      setGroups((list) =>
        list.map((item) =>
          item.id === next.id
            ? { ...item, name: next.name, memberCount: next.members.length }
            : item,
        ),
      );
    },
    [demoMode],
  );

  useEffect(() => {
    mounted.current = true;
    let active = true;
    (async () => {
      const [preferences, id, photo, raw, token] = await Promise.all([
        loadPreferences(),
        getDeviceUserId(),
        getProfilePhoto(),
        AsyncStorage.getItem(STORE),
        getOrCreateDeviceToken(),
      ]);
      let saved: SavedApp = {};
      try {
        const parsed = JSON.parse(raw || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
          saved = parsed;
      } catch {
        /* a corrupt cache should not prevent onboarding */
      }
      const mode = resolveWorkspaceMode(saved, environmentApiUrl),
        pending =
          saved.pendingPhotoUri && saved.pendingPhotoUri === photo
            ? photo
            : null;
      const avatarUri = mode.demoMode
        ? photo || saved.profile?.avatarUri
        : pending || saved.profile?.avatarUri;
      const next: Profile = {
        id,
        nickname: saved.profile?.nickname || "",
        zone: getEffectiveTimeZone(preferences),
        ...(avatarUri ? { avatarUri } : {}),
      };
      const sampleProfile = { ...next, nickname: next.nickname || "Terrence" };
      const source =
        Array.isArray(saved.demoGroups) && saved.demoGroups.length
          ? saved.demoGroups
          : createDemoGroups(sampleProfile);
      const demos = source
        .filter(
          (item) =>
            item && Array.isArray(item.members) && Array.isArray(item.events),
        )
        .map((item) =>
          reconcileOwnProfile(item, saved.profile?.id || id, sampleProfile),
        );
      if (!active) return;
      setPrefs(preferences);
      setReminderEvents(
        Array.isArray(saved.reminderEvents) ? saved.reminderEvents : [],
      );
      setProfile(next);
      setOnboarded(!!saved.onboarded);
      setApiUrl(mode.apiUrl);
      setDemoMode(mode.demoMode);
      setWidgetEnabled(saved.widgetEnabled !== false);
      setPendingPhotoUri(pending);
      setDemoGroups(demos);
      if (mode.demoMode) {
        setGroups(demos);
        setGroup(
          demos.find((item) => item.id === saved.activeGroup) ||
            demos[0] ||
            null,
        );
      } else {
        setGroups(Array.isArray(saved.groups) ? saved.groups : []);
        setGroup(
          saved.cachedGroup &&
            Array.isArray(saved.cachedGroup.members) &&
            Array.isArray(saved.cachedGroup.events)
            ? saved.cachedGroup
            : null,
        );
      }
      setImageHeaders({ Authorization: "Bearer " + token });
      setReady(true);
      await initializeNotifications(preferences.language).catch(() => {
        /* OS permission/settings remain available in Settings */
      });
    })().catch((error) => {
      if (active) {
        setReady(true);
        reportError(error);
      }
    });
    return () => {
      active = false;
      mounted.current = false;
      gate.current.invalidate();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const snapshot = JSON.stringify({
      onboarded,
      profile,
      apiUrl,
      demoMode,
      widgetEnabled,
      demoGroups,
      groups,
      activeGroup: group?.id,
      cachedGroup: demoMode ? null : group,
      pendingPhotoUri,
      reminderEvents,
    });
    persistence.current = persistence.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(STORE, snapshot))
      .catch(() => {
        if (mounted.current) notify("error");
      });
  }, [
    ready,
    onboarded,
    profile,
    apiUrl,
    demoMode,
    widgetEnabled,
    demoGroups,
    groups,
    group,
    pendingPhotoUri,
    reminderEvents,
    notify,
  ]);
  useEffect(() => {
    if (!ready || !group) return;
    const currentGroup = group;
    const entries = currentGroup.events
      .filter(
        (e) =>
          eventState(e, currentGroup.members) === "confirmed" &&
          e.responses[profile.id] === "yes",
      )
      .map((e) => ({
        ...e,
        confirmed: true,
        groupId: currentGroup.id,
        groupName: currentGroup.name,
      }));
    void Promise.resolve().then(() =>
      setReminderEvents((old) => [
        ...old.filter((e) => e.groupId !== currentGroup.id),
        ...entries,
      ]),
    );
  }, [ready, group, profile.id]);
  useEffect(() => {
    if (!ready) return;
    void setWeeklyReminder(prefs).catch(() => {});
    void syncEventReminders(reminderEvents, prefs).catch(() => {});
  }, [ready, prefs, reminderEvents]);

  async function refresh(): Promise<void> {
    if (demoMode || gate.current.busy) return;
    if (!api) {
      reportError(new Error("API_NOT_CONNECTED"));
      return;
    }
    if (
      refreshingTask.current &&
      gate.current.isCurrent(refreshingTask.current.ticket)
    )
      return refreshingTask.current.promise;
    const ticket = gate.current.startRefresh();
    if (ticket === null) return;
    const current = () => mounted.current && gate.current.isCurrent(ticket);
    setRefreshing(true);
    const task = (async () => {
      try {
        // Refresh is read-only: an in-flight refresh must never overwrite a newer nickname or zone edit.
        const remote = await api.getProfile();
        if (!current()) return;
        const page = await api.listGroups({ limit: 20 });
        if (!current()) return;
        const selectedId = group?.id || page.items[0]?.id;
        let selected: Group | null = null;
        if (selectedId) {
          try {
            selected = await api.getGroup(selectedId);
          } catch (error) {
            if (
              error instanceof APIError &&
              ["NO_PERMISSION", "NOT_FOUND"].includes(error.code)
            )
              selected =
                page.items[0] && page.items[0].id !== selectedId
                  ? await api.getGroup(page.items[0].id)
                  : null;
            else throw error;
          }
        }
        if (!current()) return;
        const canonical = pendingPhotoUri
          ? { ...remote, avatarUri: pendingPhotoUri }
          : remote;
        applyOwnProfile(canonical);
        setGroups(page.items);
        setGroupsCursor(page.nextCursor);
        setGroup(
          selected
            ? reconcileOwnProfile(selected, profile.id, canonical)
            : null,
        );
        setOffline(false);
      } catch (error) {
        if (current()) reportError(error);
      } finally {
        if (current()) setRefreshing(false);
        if (refreshingTask.current?.ticket === ticket)
          refreshingTask.current = null;
      }
    })();
    refreshingTask.current = { ticket, promise: task };
    return task;
  }
  useEffect(() => {
    if (ready && onboarded && !demoMode)
      void Promise.resolve()
        .then(refresh)
        .catch(() => {});
  }, [ready, onboarded, demoMode, api]);
  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void setWeeklyReminder(prefs).catch(() => {});
      if (!demoMode) void refresh().catch(() => {});
    });
    return () => subscription.remove();
  }, [ready, prefs, demoMode, api, group?.id]);

  async function updatePrefs(patch: Partial<AppPreferences>) {
    await run(async () => {
      const next = { ...prefs, ...patch },
        nextZone = getEffectiveTimeZone(next);
      const remote =
        patch.timeZone && !demoMode
          ? await requireApi().upsertProfile({
              nickname: profile.nickname,
              zone: nextZone,
            })
          : null;
      await savePreferences(next);
      setPrefs(next);
      if (patch.timeZone)
        applyOwnProfile(
          remote
            ? {
                ...remote,
                ...(pendingPhotoUri ? { avatarUri: pendingPhotoUri } : {}),
              }
            : { ...profile, zone: nextZone },
        );
    });
  }
  async function saveProfile(nickname: string) {
    nickname = nickname.trim();
    if (nickname.length < 2 || nickname.length > 24) {
      notify("invalidNickname");
      throw new Error("invalidNickname");
    }
    await run(async () => {
      const next = demoMode
        ? { ...profile, nickname, zone }
        : await requireApi().upsertProfile({ nickname, zone });
      applyOwnProfile(
        pendingPhotoUri ? { ...next, avatarUri: pendingPhotoUri } : next,
      );
      setOnboarded(true);
    });
  }
  async function commitDemo() {
    setReminderEvents([]);
    const localPhoto = await getProfilePhoto(),
      next = {
        ...profile,
        nickname: profile.nickname || "Terrence",
        zone,
        avatarUri: localPhoto || undefined,
      };
    const list = (demoGroups.length ? demoGroups : createDemoGroups(next)).map(
      (item) => reconcileOwnProfile(item, profile.id, next),
    );
    setProfile(next);
    setOnboarded(true);
    setDemoMode(true);
    setDemoGroups(list);
    setGroups(list);
    setGroup(list[0] || null);
    setGroupsCursor(null);
    setOffline(false);
  }
  async function enterDemo() {
    await run(commitDemo);
  }
  async function choosePhoto() {
    let selected = false;
    try {
      await run(async () => {
        const client = demoMode ? null : requireApi();
        const uri = await pickProfilePhoto();
        if (!uri) return;
        selected = true;
        // The picker replaces the old file. Immediately keep the new valid URI even if cloud upload fails.
        const local = { ...profile, avatarUri: uri };
        applyOwnProfile(local);
        setPendingPhotoUri(client ? uri : null);
        if (client) {
          const remote = await client.uploadAvatar(
            await getProfilePhotoUpload(uri),
          );
          applyOwnProfile({ ...remote, avatarUri: uri });
          setPendingPhotoUri(null);
        }
        notify("profileUpdated");
      });
    } catch (error) {
      if (selected && !demoMode)
        notify(
          prefs.language === "id"
            ? "Foto tersimpan di perangkat, tetapi belum tersinkron. Pilih lagi saat terhubung untuk mengunggahnya."
            : "Photo saved on this device, but not synced. Choose it again when connected to upload it.",
          true,
        );
      else if (
        error instanceof Error &&
        /permission|denied/i.test(error.message)
      )
        notify("cameraDenied");
      else if (!(
        error instanceof Error &&
        ["API_NOT_CONNECTED", "BUSY"].includes(error.message)
      ))
        notify("photoError");
    }
  }
  async function deletePhoto() {
    await run(async () => {
      const remote = demoMode ? null : await requireApi().removeAvatar();
      applyOwnProfile({ ...(remote || profile), avatarUri: undefined });
      setPendingPhotoUri(null);
      await removeProfilePhoto();
      notify("profileUpdated");
    });
  }
  async function switchGroup(id: string) {
    await run(async () => {
      const selected = demoMode
        ? demoGroups.find((item) => item.id === id) || null
        : await requireApi().getGroup(id);
      setGroup(selected);
    });
  }
  function requireCloud(): APIClient {
    if (demoMode) {
      setOverlay({ kind: "connection" });
      throw new Error("CLOUD_REQUIRED");
    }
    return requireApi();
  }
  async function createGroup(name: string) {
    await run(async () => {
      const client = requireCloud(),
        item = await client.createGroup(name.trim()),
        selected = await client.getGroup(item.id);
      setGroups((list) => [
        item,
        ...list.filter((existing) => existing.id !== item.id),
      ]);
      setGroup(selected);
      setOverlay(null);
      notify("groupCreated");
    });
  }
  async function joinGroup(code: string) {
    await run(async () => {
      const client = requireCloud(),
        item = await client.joinGroup(code.trim()),
        selected = await client.getGroup(item.id);
      setGroups((list) => [
        item,
        ...list.filter((existing) => existing.id !== item.id),
      ]);
      setGroup(selected);
      setOverlay(null);
      notify("groupJoined");
    });
  }
  async function confirmDayOff(day: string) {
    if (!group) {
      notify("joinFirst");
      return;
    }
    await run(async () => {
      const own = group.members.find((m) => m.id === profile.id);
      const old = own?.daysOff || [];
      let daysOff = old.some((d) => d.date === day)
        ? old
        : [...old, confirmLocalDay(day, zone)];
      if (!demoMode)
        daysOff = await requireApi().updateDaysOff(group.id, daysOff);
      replaceGroup({
        ...group,
        members: group.members.map((m) =>
          m.id === profile.id ? { ...m, daysOff } : m,
        ),
      });
      setOverlay(null);
      notify("dayOffSaved");
    });
  }
  async function removeDayOff(day: string) {
    if (!group) return;
    await run(async () => {
      const own = group.members.find((m) => m.id === profile.id);
      if (!own) return;
      const next = removeConfirmedDay(own, day);
      if (!demoMode)
        next.daysOff = await requireApi().updateDaysOff(
          group.id,
          next.daysOff || [],
          next.slots,
        );
      replaceGroup({
        ...group,
        members: group.members.map((m) => (m.id === profile.id ? next : m)),
      });
      setOverlay(null);
      notify("dayOffRemoved");
    });
  }
  async function saveAvailability(slot: Availability, replaceId?: string) {
    if (!group) {
      notify("joinFirst");
      return;
    }
    await run(async () => {
      const own = group.members.find((member) => member.id === profile.id);
      if (
        !own?.daysOff?.some(
          (day) => localDate(slot.start, day.zone) === day.date,
        )
      )
        throw new Error("DAY_OFF_REQUIRED");
      const old =
        group.members.find((member) => member.id === profile.id)?.slots || [];
      if (
        old.some(
          (existing) =>
            existing.id !== replaceId &&
            Date.parse(existing.start) < Date.parse(slot.end) &&
            Date.parse(existing.end) > Date.parse(slot.start),
        )
      )
        throw new Error("overlap");
      const slots = [
        ...old.filter((existing) => existing.id !== replaceId),
        slot,
      ];
      if (!demoMode) await requireApi().updateAvailability(group.id, slots);
      replaceGroup({
        ...group,
        members: group.members.map((member) =>
          member.id === profile.id ? { ...member, slots } : member,
        ),
      });
      setOverlay(null);
      notify("slotSaved");
    });
  }
  async function deleteAvailability(id: string) {
    if (!group) return;
    await run(async () => {
      const slots = (
        group.members.find((member) => member.id === profile.id)?.slots || []
      ).filter((slot) => slot.id !== id);
      if (!demoMode) await requireApi().updateAvailability(group.id, slots);
      replaceGroup({
        ...group,
        members: group.members.map((member) =>
          member.id === profile.id ? { ...member, slots } : member,
        ),
      });
      setOverlay(null);
      notify("slotSaved");
    });
  }
  async function createEvent(input: EventInput) {
    if (!group) {
      notify("joinFirst");
      return;
    }
    await run(async () => {
      const event: Event = demoMode
        ? {
            ...input,
            id:
              "local-" + Date.now() + "-" + Math.random().toString(36).slice(2),
            creator: profile.id,
            responses: { [profile.id]: "yes" },
          }
        : await requireApi().createEvent(group.id, input);
      replaceGroup({ ...group, events: [event, ...group.events] });
      setOverlay(null);
      notify("proposalSaved");
    });
  }
  async function respond(id: string, status: AvailabilityStatus) {
    if (!group) return;
    await run(async () => {
      if (!demoMode) await requireApi().respondToEvent(group.id, id, status);
      replaceGroup({
        ...group,
        events: group.events.map((event) =>
          event.id === id
            ? {
                ...event,
                responses: { ...event.responses, [profile.id]: status },
              }
            : event,
        ),
      });
      notify("responseSaved");
    });
  }
  async function cancelEvent(id: string) {
    if (!group) return;
    await run(async () => {
      if (!demoMode) await requireApi().cancelEvent(group.id, id);
      replaceGroup({
        ...group,
        events: group.events.map((event) =>
          event.id === id ? { ...event, cancelled: true } : event,
        ),
      });
      setOverlay(null);
      notify("planCancelled");
    });
  }
  async function loadMoreEvents() {
    if (demoMode || !group?.eventsNextCursor) return;
    await run(async () => {
      const page = await requireApi().listEvents(group.id, {
        cursor: group.eventsNextCursor,
        limit: 20,
      });
      replaceGroup({
        ...group,
        events: [
          ...group.events,
          ...page.items.filter(
            (event) => !group.events.some((old) => old.id === event.id),
          ),
        ],
        eventsNextCursor: page.nextCursor,
      });
    });
  }
  async function loadHistory() {
    if (demoMode || !group || (group.historyLoaded && !group.historyNextCursor))
      return;
    await run(async () => {
      const page = await requireApi().listEvents(group.id, {
        view: "history",
        limit: 20,
        cursor: group.historyNextCursor,
      });
      replaceGroup({
        ...group,
        events: [
          ...group.events,
          ...page.items.filter(
            (e) => !group.events.some((old) => old.id === e.id),
          ),
        ],
        historyLoaded: true,
        historyNextCursor: page.nextCursor,
      });
    });
  }
  async function loadMoreGroups() {
    if (demoMode || !groupsCursor) return;
    await run(async () => {
      const page = await requireApi().listGroups({
        cursor: groupsCursor,
        limit: 20,
      });
      setGroups((old) => [
        ...old,
        ...page.items.filter(
          (item) => !old.some((existing) => existing.id === item.id),
        ),
      ]);
      setGroupsCursor(page.nextCursor);
    });
  }
  async function connect(url: string) {
    await run(async () => {
      const client = createApiClient({
        baseUrl: url,
        getToken: getOrCreateDeviceToken,
      });
      const remote = await client.upsertProfile({
        nickname: profile.nickname || "Terrence",
        zone,
      });
      const page = await client.listGroups({ limit: 20 });
      const selected = page.items[0]
        ? await client.getGroup(page.items[0].id)
        : null;
      // State changes only after profile, memberships and selected group have all loaded.
      setApiUrl(client.baseUrl);
      setReminderEvents([]);
      setDemoMode(false);
      applyOwnProfile(
        pendingPhotoUri ? { ...remote, avatarUri: pendingPhotoUri } : remote,
      );
      setGroups(page.items);
      setGroupsCursor(page.nextCursor);
      setGroup(selected);
      setOverlay(null);
      notify("apiConnected");
    });
  }
  async function disconnect() {
    await run(async () => {
      await commitDemo();
      setApiUrl("");
      setOverlay(null);
    });
  }
  return (
    <Context.Provider
      value={{
        ready,
        onboarded,
        prefs,
        profile,
        colors,
        dark,
        zone,
        groups,
        group,
        demoMode,
        busy,
        refreshing,
        offline,
        apiUrl,
        imageHeaders,
        overlay,
        setOverlay,
        message,
        notify,
        t,
        time,
        date,
        updatePrefs,
        saveProfile,
        enterDemo,
        choosePhoto,
        deletePhoto,
        refresh,
        switchGroup,
        createGroup,
        joinGroup,
        saveAvailability,
        deleteAvailability,
        confirmDayOff,
        removeDayOff,
        createEvent,
        respond,
        cancelEvent,
        loadMoreEvents,
        loadHistory,
        loadMoreGroups,
        moreGroups: !!groupsCursor,
        connect,
        disconnect,
        widgetEnabled,
        setWidgetEnabled,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("AppProvider missing");
  return context;
}

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { useApp, type Overlay } from "../store";
import {
  addDays,
  eventState,
  formatDate,
  localDate,
  parts,
  wallToUTC,
  ZONES,
  zoneAbbreviation,
} from "../lib/domain";
import type { AvailabilityStatus } from "../lib/types";
import { shareCalendarEvent } from "../services/platformActions";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Empty,
  Field,
  Icon,
  IconButton,
  Pill,
  Press,
  Row,
  Toast,
  Txt,
} from "./ui";
import { DateControl } from "./DateControl";
import { StatusPill } from "./schedule";

function clock(instant: string, zone: string) {
  const p = parts(instant, zone);
  return (
    String(p.hour).padStart(2, "0") + ":" + String(p.minute).padStart(2, "0")
  );
}
function FormError({ error }: { error: string }) {
  const { colors } = useApp();
  return error ? (
    <View
      accessibilityLiveRegion="assertive"
      style={{
        backgroundColor: colors.dangerSoft,
        borderRadius: 12,
        padding: 13,
      }}
    >
      <Txt size={12} color={colors.danger}>
        {error}
      </Txt>
    </View>
  ) : null;
}
function errorText(e: unknown, t: (key: string) => string) {
  const code = e instanceof Error ? e.message : "error";
  const map: Record<string, string> = {
    DST_GAP: "dstGap",
    DST_AMBIGUOUS: "dstAmbiguous",
    INVALID_DATE: "invalidInput",
    INVALID_TIME: "invalidInput",
    TIME_RANGE_INVALID: "invalidRange",
    INVITE_NOT_FOUND: "notFound",
    GROUP_NOT_FOUND: "notFound",
    API_BASE_URL_INVALID: "apiInvalid",
    API_HTTPS_REQUIRED: "apiInvalid",
    BUSY: "syncing",
  };
  return t(
    map[code] ||
      (["invalidInput", "pastTime", "invalidRange", "overlap"].includes(code)
        ? code
        : "error"),
  );
}
function StatusChoices({
  value,
  onChange,
}: {
  value?: AvailabilityStatus;
  onChange: (v: AvailabilityStatus) => void;
}) {
  const { t, colors } = useApp();
  return (
    <Row style={{ gap: 8 }}>
      {(["yes", "maybe", "no"] as const).map((v) => (
        <Press
          key={v}
          label={t(v)}
          selected={v === value}
          onPress={() => onChange(v)}
          style={{
            flex: 1,
            borderRadius: 13,
            backgroundColor: v === value ? colors.accentSoft : colors.bg,
            borderWidth: 1,
            borderColor: v === value ? colors.accent : colors.line,
          }}
        >
          <View style={{ paddingVertical: 14, alignItems: "center", gap: 6 }}>
            <Icon
              name={
                v === "yes"
                  ? "checkmark-circle-outline"
                  : v === "maybe"
                    ? "help-circle-outline"
                    : "close-circle-outline"
              }
              color={v === value ? colors.accent : colors.muted}
            />
            <Txt
              size={11}
              weight="medium"
              color={v === value ? colors.accent : colors.muted}
            >
              {t(v)}
            </Txt>
          </View>
        </Press>
      ))}
    </Row>
  );
}
function SlotForm({
  overlay,
}: {
  overlay: Extract<Overlay, { kind: "slot" }>;
}) {
  const {
    t,
    zone,
    busy,
    saveAvailability,
    deleteAvailability,
    setOverlay,
    colors,
  } = useApp();
  const slot = overlay.slot;
  const [startDay, setStartDay] = useState(() =>
      slot
        ? localDate(slot.start, zone)
        : overlay.day || addDays(localDate(Date.now(), zone), 1),
    ),
    [endDay, setEndDay] = useState(() =>
      slot
        ? localDate(slot.end, zone)
        : overlay.day || addDays(localDate(Date.now(), zone), 1),
    ),
    [start, setStart] = useState(slot ? clock(slot.start, zone) : "20:00"),
    [end, setEnd] = useState(slot ? clock(slot.end, zone) : "23:00"),
    [status, setStatus] = useState<AvailabilityStatus>(slot?.status || "yes"),
    [error, setError] = useState("");
  async function save() {
    setError("");
    try {
      const a = wallToUTC(startDay, start, zone),
        b = wallToUTC(endDay, end, zone);
      if (Date.parse(b) <= Date.parse(a)) throw new Error("invalidRange");
      if (Date.parse(a) < Date.now() && !slot) throw new Error("pastTime");
      if (Date.parse(b) - Date.parse(a) > 86400000)
        throw new Error("invalidRange");
      await saveAvailability(
        { id: slot?.id || Crypto.randomUUID(), start: a, end: b, status },
        slot?.id,
      );
    } catch (e) {
      setError(errorText(e, t));
    }
  }
  return (
    <>
      <Txt size={12} muted>
        {t("slotDescription")}
      </Txt>
      <Pill label={zone + " · " + zoneAbbreviation(zone)} dot={false} />
      <Card style={{ paddingHorizontal: 15, paddingVertical: 3 }}>
        <DateControl
          label={t("date")}
          mode="date"
          value={startDay}
          onChange={(v) => {
            setStartDay(v);
            if (endDay === startDay) setEndDay(v);
          }}
        />
        <Divider />
        <DateControl
          label={t("startTime")}
          mode="time"
          value={start}
          onChange={setStart}
        />
        <Divider />
        <DateControl
          label={t("endDate")}
          mode="date"
          value={endDay}
          onChange={setEndDay}
        />
        <Divider />
        <DateControl
          label={t("endTime")}
          mode="time"
          value={end}
          onChange={setEnd}
        />
      </Card>
      <Txt size={12} weight="semibold">
        {t("status")}
      </Txt>
      <StatusChoices value={status} onChange={setStatus} />
      <FormError error={error} />
      <Button
        title={busy ? t("syncing") : t("save")}
        icon="checkmark"
        onPress={() => void save()}
        disabled={busy}
      />
      {slot && (
        <Button
          title={t("remove")}
          kind="danger"
          icon="trash-outline"
          disabled={busy}
          onPress={() =>
            setOverlay({
              kind: "confirm",
              title: t("removeSlot"),
              description: t("removeSlotDescription"),
              onConfirm: () => deleteAvailability(slot.id),
            })
          }
        />
      )}
    </>
  );
}
function EventForm({
  overlay,
}: {
  overlay: Extract<Overlay, { kind: "event" }>;
}) {
  const { t, zone, group, busy, createEvent, colors, setOverlay } = useApp(),
    original = overlay.start;
  const [day, setDay] = useState(() =>
      original
        ? localDate(original, zone)
        : addDays(localDate(Date.now(), zone), 1),
    ),
    [start, setStart] = useState(original ? clock(original, zone) : "20:00"),
    [duration, setDuration] = useState(overlay.duration || 60),
    [minimum, setMinimum] = useState(group?.members.length || 3),
    [title, setTitle] = useState(""),
    [error, setError] = useState("");
  async function save() {
    setError("");
    try {
      if (title.trim().length < 2 || title.trim().length > 60)
        throw new Error("invalidInput");
      const a = wallToUTC(day, start, zone);
      if (Date.parse(a) <= Date.now()) throw new Error("pastTime");
      await createEvent({
        title: title.trim(),
        start: a,
        end: new Date(Date.parse(a) + duration * 60000).toISOString(),
        minimum,
      });
    } catch (e) {
      setError(errorText(e, t));
    }
  }
  if (!group)
    return (
      <Empty
        title={t("joinFirst")}
        action={{
          title: t("createGroup"),
          onPress: () => setOverlay({ kind: "createGroup" }),
        }}
      />
    );
  return (
    <>
      <Txt size={12} muted>
        {t("proposalDescription")}
      </Txt>
      <Field
        label={t("activity")}
        placeholder={t("activityPlaceholder")}
        value={title}
        onChangeText={setTitle}
        maxLength={60}
      />
      <Card style={{ paddingHorizontal: 15, paddingVertical: 3 }}>
        <DateControl
          label={t("date")}
          mode="date"
          value={day}
          onChange={setDay}
        />
        <Divider />
        <DateControl
          label={t("startTime")}
          mode="time"
          value={start}
          onChange={setStart}
        />
      </Card>
      <Txt size={12} weight="semibold">
        {t("duration")}
      </Txt>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[30, 60, 90, 120, 180].map((v) => (
          <Press
            key={v}
            selected={duration === v}
            label={`${v} ${t("minute")}`}
            onPress={() => setDuration(v)}
            style={{
              backgroundColor: duration === v ? colors.accentSoft : colors.bg,
              borderWidth: 1,
              borderColor: duration === v ? colors.accent : colors.line,
              borderRadius: 12,
            }}
          >
            <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Txt
                size={12}
                color={duration === v ? colors.accent : colors.muted}
              >
                {v} {t("minute")}
              </Txt>
            </View>
          </Press>
        ))}
      </ScrollView>
      <Txt size={12} weight="semibold">
        {t("minimum")}
      </Txt>
      <Row style={{ flexWrap: "wrap", gap: 8 }}>
        {Array.from({ length: group.members.length }, (_, i) => i + 1).map(
          (v) => (
            <Press
              key={v}
              selected={minimum === v}
              label={
                v === group.members.length
                  ? t("everyone")
                  : v + " " + t("members")
              }
              onPress={() => setMinimum(v)}
              style={{
                borderRadius: 12,
                backgroundColor: minimum === v ? colors.accentSoft : colors.bg,
                borderWidth: 1,
                borderColor: minimum === v ? colors.accent : colors.line,
              }}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <Txt
                  size={12}
                  color={minimum === v ? colors.accent : colors.muted}
                >
                  {v === group.members.length ? t("everyone") : v}
                </Txt>
              </View>
            </Press>
          ),
        )}
      </Row>
      <Pill label={zone} dot={false} />
      <FormError error={error} />
      <Button
        title={busy ? t("syncing") : t("makePlan")}
        icon="add"
        disabled={busy}
        onPress={() => void save()}
      />
    </>
  );
}

function GroupForm({ join }: { join: boolean }) {
  const { t, busy, createGroup, joinGroup } = useApp();
  const [value, setValue] = useState(""),
    [error, setError] = useState("");
  async function save() {
    setError("");
    try {
      if (value.trim().length < 3) throw new Error("invalidInput");
      if (join) await joinGroup(value);
      else await createGroup(value);
    } catch (e) {
      if (e instanceof Error && e.message === "CLOUD_REQUIRED") return;
      setError(errorText(e, t));
    }
  }
  return (
    <>
      <Txt size={12} muted>
        {t(join ? "inviteDescription" : "groupsDescription")}
      </Txt>
      <Field
        label={t(join ? "inviteCode" : "groupName")}
        placeholder={join ? "ABC123XY" : t("groupPlaceholder")}
        value={value}
        onChangeText={setValue}
        maxLength={join ? 12 : 40}
        autoCapitalize={join ? "characters" : "words"}
        autoCorrect={!join}
      />
      <FormError error={error} />
      <Button
        title={busy ? t("syncing") : t(join ? "join" : "createGroup")}
        icon={join ? "enter-outline" : "add"}
        disabled={busy || value.trim().length < 3}
        onPress={() => void save()}
      />
    </>
  );
}
function Invite() {
  const { group, t, demoMode, colors, notify } = useApp();
  if (!group) return <Empty title={t("joinFirst")} />;
  const text =
    t("groupInvite") +
    " · " +
    group.name +
    "\n" +
    t("inviteCode") +
    ": " +
    group.code +
    "\n" +
    t("inviteDescription");
  return (
    <>
      <Txt size={12} muted>
        {demoMode ? t("demoNotice") : t("inviteDescription")}
      </Txt>
      <View
        style={{
          padding: 25,
          borderRadius: 20,
          backgroundColor: colors.accentSoft,
          alignItems: "center",
          gap: 7,
        }}
      >
        <Txt size={12} color={colors.accent}>
          {group.name}
        </Txt>
        <Txt
          size={30}
          weight="bold"
          color={colors.accent}
          style={{ letterSpacing: 3 }}
        >
          {group.code}
        </Txt>
      </View>
      <Button
        title={t("copy")}
        kind="secondary"
        icon="copy-outline"
        disabled={demoMode}
        onPress={() => {
          void Clipboard.setStringAsync(group.code)
            .then(() => notify("copied"))
            .catch(() => notify("error"));
        }}
      />
      <Button
        title={t("share")}
        icon="share-outline"
        disabled={demoMode}
        onPress={() => {
          void Share.share({ message: text }).catch(() => notify("error"));
        }}
      />
    </>
  );
}
function Details({ id }: { id: string }) {
  const {
      t,
      group,
      profile,
      prefs,
      time,
      date,
      setOverlay,
      respond,
      cancelEvent,
      busy,
      colors,
      notify,
    } = useApp(),
    event = group?.events.find((e) => e.id === id);
  if (!event || !group) return <Empty title={t("emptyAgenda")} />;
  const state = eventState(event, group.members),
    locked = state === "past" || state === "cancelled";
  return (
    <>
      <StatusPill event={event} />
      <Txt size={26} weight="bold" heading style={{ letterSpacing: -0.7 }}>
        {event.title}
      </Txt>
      <Card>
        <Row>
          <Icon name="calendar-outline" color={colors.accent} />
          <Txt size={14} weight="semibold">
            {date(event.start, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Txt>
        </Row>
        <Row style={{ marginTop: 12 }}>
          <Icon name="time-outline" color={colors.accent} />
          <Txt size={14}>
            {time(event.start)} – {time(event.end)}
          </Txt>
        </Row>
        <Txt size={11} muted style={{ marginTop: 12 }}>
          {t("yourTime")} · {profile.zone} · {group.name}
        </Txt>
      </Card>
      <Row between>
        <Txt size={15} weight="semibold">
          {t("participants")}
        </Txt>
        <Txt size={11} muted>
          {Object.values(event.responses).filter((v) => v === "yes").length}/
          {event.minimum} {t("confirmedCount")}
        </Txt>
      </Row>
      <View style={{ gap: 18 }}>
        {group.members.map((m) => (
          <Row key={m.id}>
            <Avatar person={m} />
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="semibold">
                {m.nickname}
                {m.id === profile.id ? " · " + t("you") : ""}
              </Txt>
              <Txt size={10} muted>
                {formatDate(event.start, m.zone, prefs.language, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {time(event.start, m.zone)}
              </Txt>
            </View>
            <Pill
              label={t(event.responses[m.id] || "unknown")}
              tone={
                event.responses[m.id] === "yes"
                  ? "green"
                  : event.responses[m.id] === "maybe"
                    ? "peach"
                    : "muted"
              }
            />
          </Row>
        ))}
      </View>
      {!locked && (
        <>
          <Divider />
          <Txt size={13} weight="semibold">
            {t("respond")}
          </Txt>
          <View pointerEvents={busy ? "none" : "auto"}>
            <StatusChoices
              value={event.responses[profile.id]}
              onChange={(v) => void respond(id, v).catch(() => {})}
            />
          </View>
        </>
      )}
      <Button
        title={t("addToCalendar")}
        kind="secondary"
        icon="calendar-outline"
        disabled={state === "cancelled"}
        onPress={() => {
          void shareCalendarEvent(
            {
              ...event,
              description: "JCuki · " + group.name,
              uid: event.id + "@jcuki",
            },
            prefs.language,
          )
            .then((r) => {
              if (r.method === "unavailable") notify("nativeOnly");
            })
            .catch(() => notify("error"));
        }}
      />
      {event.creator === profile.id && !locked && (
        <Button
          title={t("cancelPlan")}
          kind="danger"
          disabled={busy}
          onPress={() =>
            setOverlay({
              kind: "confirm",
              title: t("cancelPlan"),
              description: t("cancelPlanDescription"),
              onConfirm: () => cancelEvent(id),
            })
          }
        />
      )}
    </>
  );
}
function ZonePicker() {
  const { t, prefs, updatePrefs, setOverlay, colors } = useApp();
  const [query, setQuery] = useState("");
  let zones = ZONES;
  try {
    const all = Intl.supportedValuesOf("timeZone");
    zones = [
      ...ZONES,
      ...all
        .filter((z) => !ZONES.some(([key]) => key === z))
        .map((z) => [z, z.replace(/_/g, " ")] as [string, string]),
    ];
  } catch {}
  return (
    <>
      <Field
        label={t("pickZone")}
        value={query}
        onChangeText={setQuery}
        placeholder="Jakarta, Berlin, Tokyo…"
        autoCorrect={false}
      />
      <View style={{ gap: 5 }}>
        {[
          ["auto", t("autoZone")],
          ...zones.filter(([key, label]) =>
            (key + " " + label).toLowerCase().includes(query.toLowerCase()),
          ),
        ].map(([value, label]) => (
          <Press
            key={value}
            label={label}
            selected={prefs.timeZone === value}
            onPress={() => {
              setOverlay(null);
              void updatePrefs({ timeZone: value }).catch(() => {});
            }}
            style={{
              borderRadius: 12,
              backgroundColor:
                prefs.timeZone === value ? colors.accentSoft : "transparent",
            }}
          >
            <Row between style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
              <Txt size={13} style={{ flex: 1 }}>
                {label}
              </Txt>
              {prefs.timeZone === value && (
                <Icon name="checkmark-circle" color={colors.accent} />
              )}
            </Row>
          </Press>
        ))}
      </View>
    </>
  );
}
function Connection() {
  const { t, apiUrl, busy, connect, disconnect, demoMode } = useApp();
  const [url, setUrl] = useState(apiUrl),
    [error, setError] = useState("");
  async function submit() {
    setError("");
    try {
      await connect(url.trim());
    } catch (e) {
      setError(errorText(e, t));
    }
  }
  return (
    <>
      <Txt size={12} muted>
        {t("apiSetupDescription")}
      </Txt>
      <Field
        label={t("apiAddress")}
        value={url}
        onChangeText={setUrl}
        placeholder="https://jcuki.example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <FormError error={error} />
      <Button
        title={busy ? t("syncing") : t("apiConnect")}
        icon="cloud-outline"
        disabled={busy || !url.trim()}
        onPress={() => void submit()}
      />
      {!demoMode && (
        <Button
          title={t("apiDisconnect")}
          kind="secondary"
          disabled={busy}
          onPress={() => void disconnect().catch(() => {})}
        />
      )}
      <Txt size={11} muted>
        {t("deviceIdentity")}
      </Txt>
    </>
  );
}
export function OverlayHost() {
  const { overlay, setOverlay, t, colors, busy } = useApp(),
    insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  if (!overlay) return null;
  const titles: Record<Overlay["kind"], string> = {
    slot: overlay.kind === "slot" && overlay.slot ? "edit" : "addAvailability",
    event: "makePlan",
    details: "planDetails",
    createGroup: "createGroup",
    joinGroup: "joinGroup",
    invite: "invite",
    zone: "pickZone",
    choice: "",
    connection: "apiSetupTitle",
    confirm: "",
  };
  const title =
    overlay.kind === "choice" || overlay.kind === "confirm"
      ? overlay.title
      : t(titles[overlay.kind]);
  return (
    <Modal
      visible
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={() => !busy && !confirming && setOverlay(null)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#11122377",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "92%",
            width: "100%",
            maxWidth: 620,
            alignSelf: "center",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingBottom: Math.max(insets.bottom, 18),
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 35,
              height: 4,
              borderRadius: 3,
              backgroundColor: colors.line,
              marginTop: 10,
            }}
          />
          <Row
            between
            style={{
              paddingLeft: 20,
              paddingRight: 12,
              paddingTop: 9,
              paddingBottom: 5,
            }}
          >
            <Txt
              size={21}
              weight="bold"
              heading
              style={{ flex: 1, letterSpacing: -0.4 }}
            >
              {title}
            </Txt>
            <IconButton
              label={t("close")}
              icon="close"
              onPress={() => !busy && !confirming && setOverlay(null)}
            />
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingTop: 10, gap: 17 }}
          >
            {overlay.kind === "slot" && (
              <SlotForm key={overlay.slot?.id || "new"} overlay={overlay} />
            )}{" "}
            {overlay.kind === "event" && <EventForm overlay={overlay} />}{" "}
            {overlay.kind === "createGroup" && <GroupForm join={false} />}{" "}
            {overlay.kind === "joinGroup" && <GroupForm join />}{" "}
            {overlay.kind === "invite" && <Invite />}{" "}
            {overlay.kind === "details" && <Details id={overlay.id} />}{" "}
            {overlay.kind === "zone" && <ZonePicker />}{" "}
            {overlay.kind === "connection" && <Connection />}{" "}
            {overlay.kind === "choice" &&
              overlay.choices.map((choice) => (
                <Press
                  key={choice.value}
                  selected={choice.value === overlay.value}
                  label={choice.label}
                  onPress={() => {
                    setOverlay(null);
                    overlay.onSelect(choice.value);
                  }}
                  style={{
                    backgroundColor:
                      choice.value === overlay.value
                        ? colors.accentSoft
                        : colors.bg,
                    borderRadius: 13,
                  }}
                >
                  <Row between style={{ padding: 15 }}>
                    <Txt
                      size={14}
                      weight={
                        choice.value === overlay.value ? "semibold" : "regular"
                      }
                    >
                      {choice.label}
                    </Txt>
                    {choice.value === overlay.value && (
                      <Icon name="checkmark-circle" color={colors.accent} />
                    )}
                  </Row>
                </Press>
              ))}{" "}
            {overlay.kind === "confirm" && (
              <>
                <Txt size={13} muted>
                  {overlay.description}
                </Txt>
                <Button
                  title={t("done")}
                  kind="danger"
                  disabled={busy || confirming}
                  onPress={() => {
                    setConfirming(true);
                    void overlay
                      .onConfirm()
                      .catch(() => {})
                      .finally(() => setConfirming(false));
                  }}
                />
                <Button
                  title={t("cancel")}
                  kind="secondary"
                  disabled={busy || confirming}
                  onPress={() => setOverlay(null)}
                />
              </>
            )}
          </ScrollView>
          <Toast />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

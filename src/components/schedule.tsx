import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { useApp } from "../store";
import {
  addDays,
  eventState,
  formatDate,
  localDate,
  matchingSlots,
  paginate,
  withoutBookedTime,
  zoneAbbreviation,
} from "../lib/domain";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Icon,
  IconButton,
  Pager,
  Pill,
  Press,
  Row,
  SectionTitle,
  Txt,
} from "./ui";
import type { Event } from "../lib/types";
export function dayText(
  day: string,
  language: "id" | "en",
  options: Intl.DateTimeFormatOptions,
) {
  return formatDate(day + "T12:00:00Z", "UTC", language, options);
}
export function WeekStrip({
  start,
  selected,
  onSelect,
  onWeek,
}: {
  start: string;
  selected: string;
  onSelect: (day: string) => void;
  onWeek: (n: number) => void;
}) {
  const { t, colors, prefs, group, profile, zone } = useApp();
  const scroll = useRef<ScrollView>(null),
    { width } = useWindowDimensions();
  const itemWidth = Math.max(
    48,
    Math.min(78, (Math.min(width, 820) - 80 - 36) / 7),
  );
  const mine = group?.members.find((m) => m.id === profile.id)?.slots || [];
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start],
  );
  const count = mine.filter(
    (s) =>
      s.status === "yes" &&
      localDate(s.start, zone) >= start &&
      localDate(s.start, zone) <= days[6],
  ).length;
  useEffect(() => {
    const index = days.indexOf(selected);
    if (index >= 0)
      scroll.current?.scrollTo({
        x: Math.max(
          0,
          index * (itemWidth + 6) - (width - 80) / 2 + itemWidth / 2,
        ),
        animated: false,
      });
  }, [selected, days, width, itemWidth]);
  return (
    <Card>
      <Row between style={{ marginBottom: 18 }}>
        <View>
          <Txt weight="bold" size={17} heading>
            {t("yourWeek")}
          </Txt>
          <Txt size={11} muted>
            {dayText(start, prefs.language, {
              weekday: undefined,
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {dayText(days[6], prefs.language, {
              weekday: undefined,
              day: "numeric",
              month: "short",
            })}
          </Txt>
        </View>
        <Row style={{ gap: 0 }}>
          <IconButton
            icon="chevron-back"
            label={t("previousWeek")}
            onPress={() => onWeek(-1)}
          />
          <IconButton
            icon="chevron-forward"
            label={t("nextWeek")}
            onPress={() => onWeek(1)}
          />
        </Row>
      </Row>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
      >
        {days.map((day) => {
          const active = day === selected,
            has = mine.some(
              (s) => localDate(s.start, zone) === day && s.status === "yes",
            );
          return (
            <Press
              key={day}
              label={
                dayText(day, prefs.language, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }) + (has ? ", " + t("available") : "")
              }
              selected={active}
              onPress={() => onSelect(day)}
              style={{
                width: itemWidth,
                borderRadius: 15,
                backgroundColor: active ? "#5B51D8" : colors.bg,
              }}
            >
              <View
                style={{
                  minHeight: 87,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Txt size={10} color={active ? "#E3E0FF" : colors.muted}>
                  {dayText(day, prefs.language, {
                    weekday: "short",
                    day: undefined,
                    month: undefined,
                  })}
                </Txt>
                <Txt
                  size={20}
                  weight="semibold"
                  color={active ? "#FFFFFF" : colors.text}
                >
                  {Number(day.slice(-2))}
                </Txt>
                <View
                  style={{
                    height: 5,
                    width: 5,
                    borderRadius: 3,
                    backgroundColor: active
                      ? "#FFFFFF"
                      : has
                        ? colors.green
                        : colors.line,
                  }}
                />
              </View>
            </Press>
          );
        })}
      </ScrollView>
      <Row between style={{ marginTop: 14 }}>
        <Row style={{ gap: 5 }}>
          <Icon
            name="checkmark-circle-outline"
            size={14}
            color={colors.green}
          />
          <Txt size={10} muted>
            {count} {t("freeSlots")}
          </Txt>
        </Row>
        <Button
          title={t("thisWeek")}
          kind="text"
          onPress={() => onSelect(localDate(Date.now(), zone))}
        />
      </Row>
    </Card>
  );
}
export function DemoNotice() {
  const { demoMode, t, setOverlay, colors } = useApp();
  if (!demoMode) return null;
  return (
    <Row
      between
      style={{
        gap: 8,
        backgroundColor: colors.accentSoft,
        borderRadius: 14,
        paddingLeft: 13,
        paddingRight: 6,
        paddingVertical: 5,
      }}
    >
      <Row style={{ gap: 7, flex: 1 }}>
        <Icon name="flask-outline" size={16} color={colors.accent} />
        <Txt size={10} color={colors.accent} style={{ flex: 1 }}>
          {t("demoNotice")}
        </Txt>
      </Row>
      <Button
        title={t("createOwn")}
        kind="text"
        onPress={() => setOverlay({ kind: "createGroup" })}
      />
    </Row>
  );
}
export function StatusPill({ event }: { event: Event }) {
  const { group, t } = useApp();
  const state = eventState(event, group?.members || []);
  return (
    <Pill
      label={t(state)}
      tone={
        state === "confirmed"
          ? "green"
          : state === "pending"
            ? "peach"
            : "muted"
      }
    />
  );
}
export function Upcoming() {
  const { t, group, time, date, setOverlay } = useApp();
  const e = group?.events
    .filter((e) =>
      ["confirmed", "pending"].includes(eventState(e, group.members)),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  return (
    <View
      style={{
        backgroundColor: "#5B51D8",
        borderRadius: 26,
        padding: 23,
        overflow: "hidden",
        minHeight: 236,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -65,
          top: -95,
          width: 260,
          height: 260,
          borderWidth: 1,
          borderColor: "#FFFFFF1C",
          borderRadius: 130,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -35,
          top: -65,
          width: 200,
          height: 200,
          borderWidth: 1,
          borderColor: "#FFFFFF16",
          borderRadius: 100,
        }}
      />
      <Row between>
        <Txt
          size={10}
          weight="semibold"
          color="#DDD8FF"
          style={{ letterSpacing: 1.5, textTransform: "uppercase" }}
        >
          {t("upcoming")}
        </Txt>
        {e && (
          <View
            style={{
              backgroundColor: "#FFFFFF20",
              borderRadius: 8,
              paddingHorizontal: 9,
              paddingVertical: 5,
            }}
          >
            <Txt size={10} weight="semibold" color="#FFFFFF">
              {t(eventState(e, group!.members))}
            </Txt>
          </View>
        )}
      </Row>
      <Txt
        size={26}
        weight="bold"
        color="#FFFFFF"
        heading
        style={{ letterSpacing: -0.6, marginTop: 21 }}
      >
        {e ? e.title : t("noPlan")}
      </Txt>
      <Row style={{ marginTop: 8, gap: 14, flexWrap: "wrap" }}>
        {e ? (
          <>
            <Row style={{ gap: 5 }}>
              <Icon name="calendar-outline" color="#E3DFFF" size={15} />
              <Txt size={11} color="#EAE7FF">
                {date(e.start, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </Txt>
            </Row>
            <Row style={{ gap: 5 }}>
              <Icon name="time-outline" color="#E3DFFF" size={15} />
              <Txt size={11} color="#EAE7FF">
                {time(e.start)} – {time(e.end)}
              </Txt>
            </Row>
          </>
        ) : (
          <Txt size={12} color="#EAE7FF">
            {t("noPlanDescription")}
          </Txt>
        )}
      </Row>
      <Row between style={{ marginTop: 25, gap: 8 }}>
        <Row style={{ gap: 7, flex: 1 }}>
          <Row style={{ gap: 0 }}>
            {group?.members.slice(0, 4).map((m, i) => (
              <View
                key={m.id}
                style={{
                  marginLeft: i ? -9 : 0,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: "#5B51D8",
                }}
              >
                <Avatar person={m} size={30} />
              </View>
            ))}
          </Row>
          {e && (
            <Txt size={10} color="#E3DFFF">
              {Object.values(e.responses).filter((x) => x === "yes").length}/
              {group?.members.length}
            </Txt>
          )}
        </Row>
        <Button
          title={e ? t("respond") : t("makePlan")}
          icon={e ? "arrow-forward" : "add"}
          kind="secondary"
          textColor="#222334"
          onPress={() =>
            setOverlay(e ? { kind: "details", id: e.id } : { kind: "event" })
          }
          style={{ backgroundColor: "#FFFFFF", borderWidth: 0 }}
        />
      </Row>
    </View>
  );
}
export function Suggestions() {
  const { group, t, colors, time, date, setOverlay } = useApp();
  const [duration, setDuration] = useState(60);
  const now = useMinuteClock();
  const matches = group
    ? matchingSlots(withoutBookedTime(group.members, group.events), {
        start: now,
        end: now + 7 * 86400000,
        duration,
        min: group.members.length,
      })
    : [];
  return (
    <View>
      <SectionTitle
        title={t("matched")}
        description={t("matchedDescription")}
      />
      <Row style={{ gap: 8, marginBottom: 13 }}>
        {[30, 60, 120].map((n) => (
          <Press
            key={n}
            label={`${n} ${t("minute")}`}
            selected={duration === n}
            onPress={() => setDuration(n)}
            style={{
              borderRadius: 10,
              backgroundColor:
                duration === n ? colors.accentSoft : colors.surface,
              borderWidth: 1,
              borderColor: duration === n ? colors.accentSoft : colors.line,
            }}
          >
            <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
              <Txt
                size={11}
                weight="medium"
                color={duration === n ? colors.accent : colors.muted}
              >
                {n} {t("minute")}
              </Txt>
            </View>
          </Press>
        ))}
      </Row>
      {matches.length ? (
        <View style={{ gap: 10 }}>
          {matches.slice(0, 3).map((s) => (
            <Press
              key={s.start}
              label={`${date(s.start)} ${time(s.start)} ${t("suggest")}`}
              onPress={() =>
                setOverlay({
                  kind: "event",
                  start: new Date(s.start).toISOString(),
                  duration,
                })
              }
              style={{
                borderRadius: 18,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Row style={{ padding: 14, gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    minHeight: 56,
                    borderRadius: 13,
                    backgroundColor: colors.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt
                    size={9}
                    weight="medium"
                    color={colors.accent}
                    style={{ textTransform: "uppercase" }}
                  >
                    {date(s.start, {
                      month: "short",
                      day: undefined,
                      weekday: undefined,
                    })}
                  </Txt>
                  <Txt size={20} weight="bold" color={colors.accent}>
                    {date(s.start, {
                      day: "numeric",
                      weekday: undefined,
                      month: undefined,
                    })}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={12} weight="semibold">
                    {date(s.start, {
                      weekday: "long",
                      month: undefined,
                      day: undefined,
                    })}
                  </Txt>
                  <Txt size={11} muted>
                    {time(s.start)} – {time(s.end)}
                  </Txt>
                  <Row style={{ gap: 4, marginTop: 4 }}>
                    <Icon
                      name="checkmark-circle"
                      size={12}
                      color={colors.green}
                    />
                    <Txt size={10} color={colors.green}>
                      {t("everyoneAvailable")}
                    </Txt>
                  </Row>
                </View>
                <Icon name="arrow-forward" color={colors.accent} size={21} />
              </Row>
            </Press>
          ))}
        </View>
      ) : (
        <Card>
          <Empty
            title={t("noMatch")}
            description={t("noMatchDescription")}
            icon="time-outline"
          />
        </Card>
      )}
    </View>
  );
}
export function CircleCard() {
  const {
    t,
    group,
    colors,
    time,
    profile,
    prefs,
    setOverlay,
    groups,
    switchGroup,
  } = useApp();
  const now = useMinuteClock();
  return (
    <Card>
      <SectionTitle
        title={t("yourCircle")}
        action={group ? t("invite") : undefined}
        onAction={() => setOverlay({ kind: "invite" })}
      />
      {group ? (
        <>
          <Press
            label={t("selectGroup")}
            onPress={() => {
              if (groups.length > 1)
                setOverlay({
                  kind: "choice",
                  title: t("selectGroup"),
                  choices: groups.map((g) => ({ label: g.name, value: g.id })),
                  value: group.id,
                  onSelect: (v) => void switchGroup(v).catch(() => {}),
                });
            }}
          >
            <Row
              between
              style={{
                marginBottom: 15,
                backgroundColor: colors.bg,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Txt size={12} weight="semibold">
                {group.name}
              </Txt>
              <Row style={{ gap: 6 }}>
                <Txt size={11} muted>
                  {group.members.length} {t("members")}
                </Txt>
                {groups.length > 1 && (
                  <Icon name="chevron-down" size={15} color={colors.muted} />
                )}
              </Row>
            </Row>
          </Press>
          <View style={{ gap: 20 }}>
            {group.members.map((m) => (
              <Row key={m.id}>
                <Avatar person={m} />
                <View style={{ flex: 1 }}>
                  <Txt size={12} weight="semibold" numberOfLines={1}>
                    {m.nickname}
                    {m.id === profile.id ? " · " + t("you") : ""}
                  </Txt>
                  <Txt size={10} muted>
                    {m.zone.split("/").at(-1)?.replace(/_/g, " ")} ·{" "}
                    {zoneAbbreviation(m.zone, now)}
                  </Txt>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Txt
                    size={15}
                    weight="semibold"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {time(now, m.zone)}
                  </Txt>
                  <Txt size={9} muted>
                    {formatDate(now, m.zone, prefs.language, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </Txt>
                </View>
              </Row>
            ))}
          </View>
        </>
      ) : (
        <Empty
          title={t("noGroups")}
          description={t("noGroupsDescription")}
          icon="people-outline"
          action={{
            title: t("createGroup"),
            onPress: () => setOverlay({ kind: "createGroup" }),
          }}
        />
      )}
    </Card>
  );
}
export function AgendaList({ full = false }: { full?: boolean }) {
  const {
    t,
    group,
    time,
    date,
    setOverlay,
    colors,
    loadMoreEvents,
    loadHistory,
    busy,
  } = useApp();
  const now = useMinuteClock();
  const [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1);
  const items = (group?.events || [])
    .filter((e) => filter === "all" || eventState(e, group!.members) === filter)
    .sort((a, b) => {
      const futureA = Date.parse(a.end) > now,
        futureB = Date.parse(b.end) > now;
      return futureA !== futureB
        ? futureA
          ? -1
          : 1
        : futureA
          ? Date.parse(a.start) - Date.parse(b.start)
          : Date.parse(b.start) - Date.parse(a.start);
    });
  const p = paginate(items, page, 4);
  return (
    <Card>
      <SectionTitle
        title={t("agenda")}
        action={full ? t("makePlan") : t("viewAll")}
        onAction={() =>
          full ? setOverlay({ kind: "event" }) : router.push("/agenda")
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingBottom: 14 }}
      >
        {["all", "pending", "confirmed", "past"].map((v) => (
          <Press
            key={v}
            label={t(v)}
            selected={filter === v}
            onPress={() => {
              setFilter(v);
              setPage(1);
              if (v === "past" && !group?.historyLoaded)
                void loadHistory().catch(() => {});
            }}
            style={{
              borderRadius: 10,
              backgroundColor: filter === v ? colors.accentSoft : colors.bg,
            }}
          >
            <View style={{ paddingHorizontal: 13, paddingVertical: 9 }}>
              <Txt
                size={11}
                weight="semibold"
                color={filter === v ? colors.accent : colors.muted}
              >
                {t(v)}
              </Txt>
            </View>
          </Press>
        ))}
      </ScrollView>
      {p.items.length ? (
        p.items.map((e) => (
          <Press
            key={e.id}
            label={`${e.title}, ${date(e.start)}, ${time(e.start)}, ${t("planDetails")}`}
            onPress={() => setOverlay({ kind: "details", id: e.id })}
          >
            <Row
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <View
                style={{
                  width: 48,
                  minHeight: 54,
                  borderRadius: 12,
                  backgroundColor: colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt size={20} weight="semibold">
                  {date(e.start, {
                    day: "numeric",
                    month: undefined,
                    weekday: undefined,
                  })}
                </Txt>
                <Txt size={9} muted style={{ textTransform: "uppercase" }}>
                  {date(e.start, {
                    month: "short",
                    day: undefined,
                    weekday: undefined,
                  })}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={13} weight="semibold">
                  {e.title}
                </Txt>
                <Txt size={10} muted style={{ marginTop: 3 }}>
                  {time(e.start)} – {time(e.end)}
                </Txt>
                <View style={{ marginTop: 7 }}>
                  <StatusPill event={e} />
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Press>
        ))
      ) : (
        <Empty title={t("emptyAgenda")} icon="calendar-outline" />
      )}
      <Pager page={p.page} pages={p.pages} onPage={setPage} />
      {(filter === "past"
        ? group?.historyNextCursor
        : group?.eventsNextCursor) && (
        <Button
          title={t("next")}
          kind="text"
          disabled={busy}
          onPress={() =>
            void (filter === "past" ? loadHistory() : loadMoreEvents()).catch(
              () => {},
            )
          }
          style={{ marginTop: 8 }}
        />
      )}
    </Card>
  );
}
export function ReminderCard() {
  const { t, colors } = useApp();
  return (
    <View
      style={{ backgroundColor: colors.peach, borderRadius: 22, padding: 22 }}
    >
      <Row style={{ alignItems: "flex-start", gap: 14 }}>
        <View
          style={{
            width: 43,
            height: 43,
            borderRadius: 14,
            backgroundColor: "#FFFFFF55",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="notifications-outline" color={colors.peachText} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" size={16} color={colors.peachText}>
            {t("newWeek")}
          </Txt>
          <Txt size={11} color={colors.peachText} style={{ marginTop: 5 }}>
            {t("newWeekDescription")}
          </Txt>
        </View>
      </Row>
      <Button
        title={t("setReminder")}
        icon="arrow-forward"
        kind="text"
        onPress={() => router.push("/(tabs)/settings")}
        style={{ alignSelf: "flex-start", marginLeft: 43, marginTop: 9 }}
      />
    </View>
  );
}

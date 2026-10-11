import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { useApp } from "../store";
import { eventState, formatDate, paginate } from "../lib/domain";
import {
  Button,
  Card,
  Empty,
  Icon,
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
export function DemoNotice() {
  const { demoMode, t, setOverlay, colors } = useApp();
  if (!demoMode) return null;
  return (
    <Row
      between
      style={{
        gap: 8,
        borderBottomColor: colors.line,
        borderBottomWidth: 1,
        paddingBottom: 8,
      }}
    >
      <Row style={{ gap: 7, flex: 1 }}>
        <Icon name="flask-outline" size={16} color={colors.accent} />
        <Txt size={12} muted style={{ flex: 1 }}>
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

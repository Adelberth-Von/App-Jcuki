import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { useApp } from "../store";
import { eventState, formatDate, localDate, paginate } from "../lib/domain";
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
    zone,
  } = useApp();
  const now = useMinuteClock();
  const [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1);
  const items = (group?.events || [])
    .filter((event) => {
      if (!full) return !event.cancelled && Date.parse(event.end) > now;
      return (
        filter === "all" || eventState(event, group!.members, now) === filter
      );
    })
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
  const p = paginate(items, page, full ? 4 : 3);
  return (
    <Card>
      {!full && (
        <SectionTitle
          title={t("agenda")}
          action={t("viewAll")}
          onAction={() => router.push("/agenda")}
        />
      )}
      {full && (
        <Row style={{ flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
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
                borderRadius: 12,
                backgroundColor: filter === v ? colors.accentSoft : colors.bg,
              }}
            >
              <Txt
                size={12}
                weight="semibold"
                color={filter === v ? colors.accent : colors.muted}
                style={{ paddingHorizontal: 12, textAlign: "center" }}
              >
                {t(v)}
              </Txt>
            </Press>
          ))}
        </Row>
      )}
      {p.items.length ? (
        p.items.map((e, index) => (
          <Press
            key={e.id}
            label={`${e.title}, ${date(e.start)}, ${time(e.start)}, ${t("planDetails")}`}
            onPress={() => setOverlay({ kind: "details", id: e.id })}
          >
            <Row
              style={{
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.line,
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
                <Txt size={12} muted>
                  {date(e.start, {
                    month: "short",
                    day: undefined,
                    weekday: undefined,
                  })}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="semibold">
                  {e.title}
                </Txt>
                <Txt size={12} muted style={{ marginTop: 2 }}>
                  {time(e.start)} – {time(e.end)}
                  {localDate(e.start, zone) !== localDate(e.end, zone)
                    ? " (+1)"
                    : ""}
                </Txt>
                <View style={{ marginTop: 4 }}>
                  <StatusPill event={e} />
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Press>
        ))
      ) : (
        <Empty
          title={t(full ? "emptyAgenda" : "noPlan")}
          icon="calendar-outline"
          action={{
            title: t("makePlan"),
            testID: "make-plan",
            onPress: () => setOverlay({ kind: "event" }),
          }}
        />
      )}
      {full && <Pager page={p.page} pages={p.pages} onPage={setPage} />}
      {full &&
        (filter === "past"
          ? group?.historyNextCursor
          : group?.eventsNextCursor) && (
          <Button
            title={t("loadMore")}
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

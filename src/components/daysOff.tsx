import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { useMinuteClock } from "../hooks/useMinuteClock";
import {
  addDays,
  localDate,
  paginate,
  playingSlots,
  weekStart,
  zoneAbbreviation,
} from "../lib/domain";
import type { DayOff, Member } from "../lib/types";
import {
  Avatar,
  Card,
  Divider,
  Empty,
  Icon,
  IconButton,
  Pager,
  Press,
  Row,
  SectionTitle,
  Txt,
} from "./ui";
import { dayText } from "./schedule";

export function CalendarMonth({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (day: string) => void;
}) {
  const { colors, t, prefs, group, profile, zone } = useApp();
  const [month, setMonth] = useState(selected.slice(0, 7) + "-01");
  const [width, setWidth] = useState(336);
  const gridWidth = Math.max(336, width),
    today = localDate(useMinuteClock(), zone);
  const confirmed =
    group?.members.find((m) => m.id === profile.id)?.daysOff || [];
  const start = weekStart(month),
    anchor = new Date(month + "T12:00:00Z");
  const end = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  );
  const length =
    Math.ceil((((anchor.getUTCDay() + 6) % 7) + end.getUTCDate()) / 7) * 7;
  const days = Array.from({ length }, (_, i) => addDays(start, i));
  function move(n: number) {
    const d = new Date(month + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 10));
  }
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <Row
        between
        style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}
      >
        <Txt size={20} weight="bold" heading style={{ flex: 1, marginLeft: 6 }}>
          {dayText(month, prefs.language, {
            month: "long",
            year: "numeric",
            day: undefined,
            weekday: undefined,
          })}
        </Txt>
        <Row style={{ gap: 0 }}>
          <IconButton
            icon="chevron-back"
            label={t("previousMonth")}
            onPress={() => move(-1)}
          />
          <IconButton
            icon="chevron-forward"
            label={t("nextMonth")}
            onPress={() => move(1)}
          />
        </Row>
      </Row>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={gridWidth > width}
        >
          <View style={{ width: gridWidth, paddingBottom: 10 }}>
            <Row style={{ gap: 0, marginBottom: 4 }}>
              {Array.from({ length: 7 }, (_, i) => (
                <View
                  key={i}
                  style={{ width: gridWidth / 7, alignItems: "center" }}
                >
                  <Txt size={12} muted weight="medium">
                    {dayText(addDays(start, i), prefs.language, {
                      weekday: "short",
                      month: undefined,
                      day: undefined,
                    })}
                  </Txt>
                </View>
              ))}
            </Row>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {days.map((day) => {
                const has = confirmed.some((d) => d.date === day),
                  active = day === selected,
                  inMonth = day.slice(0, 7) === month.slice(0, 7),
                  disabled = !inMonth || (day < today && !has);
                return (
                  <Press
                    key={day}
                    label={
                      dayText(day, prefs.language, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }) +
                      ", " +
                      t(has ? "confirmedDayOff" : "notConfirmed")
                    }
                    selected={active}
                    disabled={disabled}
                    onPress={() => onSelect(day)}
                    style={{ width: gridWidth / 7, paddingVertical: 3 }}
                  >
                    <View
                      style={{
                        minHeight: 54,
                        marginHorizontal: 2,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        backgroundColor: active
                          ? colors.accent
                          : has
                            ? colors.accentSoft
                            : "transparent",
                        borderWidth: day === today ? 1 : 0,
                        borderColor: colors.accent,
                      }}
                    >
                      <Txt
                        size={16}
                        weight={active || has ? "bold" : "medium"}
                        color={active ? colors.onAccent : colors.text}
                      >
                        {Number(day.slice(-2))}
                      </Txt>
                      <View style={{ height: 12 }}>
                        {has ? (
                          <Icon
                            name="checkmark"
                            size={12}
                            color={active ? colors.onAccent : colors.accent}
                          />
                        ) : day === today ? (
                          <View
                            style={{
                              width: 4,
                              height: 4,
                              marginTop: 4,
                              borderRadius: 2,
                              backgroundColor: active
                                ? colors.onAccent
                                : colors.accent,
                            }}
                          />
                        ) : null}
                      </View>
                    </View>
                  </Press>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      <Divider />
      <Row between style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Row style={{ gap: 6, flex: 1 }}>
          <Icon name="checkmark-circle" size={16} color={colors.accent} />
          <Txt size={12} muted style={{ flex: 1 }}>
            {t("calendarLegend")}
          </Txt>
        </Row>
        <Press
          label={t("today")}
          onPress={() => {
            setMonth(today.slice(0, 7) + "-01");
            onSelect(today);
          }}
        >
          <Txt size={12} weight="semibold" color={colors.accent}>
            {t("today")}
          </Txt>
        </Press>
      </Row>
      {width < 336 && (
        <Txt muted size={12} style={{ padding: 12, paddingTop: 0 }}>
          {t("calendarScroll")}
        </Txt>
      )}
    </Card>
  );
}

export function DayOffRow({
  day,
  member,
  editable = false,
}: {
  day: DayOff;
  member: Member;
  editable?: boolean;
}) {
  const { t, colors, prefs, time, setOverlay, zone } = useApp();
  const slots = playingSlots(member.slots, day);
  const content = (
    <Row style={{ minHeight: 70, paddingVertical: 12 }}>
      <View
        style={{
          width: 48,
          height: 52,
          borderRadius: 12,
          backgroundColor: colors.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Txt size={20} weight="bold" color={colors.accent}>
          {Number(day.date.slice(-2))}
        </Txt>
        <Txt size={12} color={colors.accent}>
          {dayText(day.date, prefs.language, {
            month: "short",
            day: undefined,
            weekday: undefined,
          })}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={14} weight="semibold">
          {dayText(day.date, prefs.language, {
            weekday: "long",
            month: undefined,
            day: undefined,
          })}
        </Txt>
        <Txt size={12} muted>
          {slots.length
            ? slots
                .map(
                  (s) =>
                    time(s.start) +
                    " – " +
                    time(s.end) +
                    (localDate(s.end, zone) !== localDate(s.start, zone)
                      ? " (+1)"
                      : ""),
                )
                .join(" · ")
            : t("noPlayTimeYet")}
        </Txt>
        <Txt size={12} muted>
          {zoneAbbreviation(day.zone, day.date + "T12:00:00Z")}
          {slots.length
            ? " · " +
              t("yourTime") +
              " " +
              zoneAbbreviation(zone, slots[0].start)
            : ""}
        </Txt>
        {slots.length > 0 && localDate(slots[0].start, zone) !== day.date && (
          <Txt size={12} muted>
            {t("yourTime")}:{" "}
            {dayText(localDate(slots[0].start, zone), prefs.language, {
              day: "numeric",
              month: "short",
              weekday: undefined,
            })}
          </Txt>
        )}
      </View>
      <Icon
        name={editable ? "chevron-forward" : "checkmark-circle"}
        size={20}
        color={colors.accent}
      />
    </Row>
  );
  return editable ? (
    <Press
      label={day.date + ", " + t("confirmedDayOff") + ", " + t("addPlayTime")}
      onPress={() =>
        setOverlay({ kind: "slot", day: day.date, slot: slots[0] })
      }
    >
      {content}
    </Press>
  ) : (
    content
  );
}
export function MyDaysOff({ omitFirst = false }: { omitFirst?: boolean }) {
  const { t, group, profile } = useApp();
  const [page, setPage] = useState(1);
  const member = group?.members.find((m) => m.id === profile.id),
    now = useMinuteClock();
  const list = (member?.daysOff || [])
      .filter((d) => d.date >= localDate(now, d.zone))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(omitFirst ? 1 : 0),
    result = paginate(list, page, 4);
  return (
    <Card>
      <SectionTitle
        title={t(omitFirst ? "otherDaysOff" : "myDaysOff")}
        description={
          list.length ? list.length + " " + t("allConfirmed") : undefined
        }
      />
      {member && list.length ? (
        result.items.map((d) => (
          <View key={d.date}>
            <DayOffRow day={d} member={member} editable />
            <Divider />
          </View>
        ))
      ) : (
        <Empty
          title={t("noConfirmedDays")}
          description={t("noConfirmedDaysDescription")}
          icon="calendar-outline"
        />
      )}
      <Pager page={result.page} pages={result.pages} onPage={setPage} />
    </Card>
  );
}
export function FriendsSchedule({ date }: { date?: string }) {
  const { t, group, profile, time, colors, prefs } = useApp();
  const [page, setPage] = useState(1),
    [expanded, setExpanded] = useState<string | null>(null),
    [dayPage, setDayPage] = useState(1);
  const now = useMinuteClock(),
    friends = group?.members.filter((m) => m.id !== profile.id) || [],
    result = paginate(friends, page, 4);
  return (
    <Card>
      <SectionTitle
        title={t("friendsSchedule")}
        description={t("friendsHint")}
        action={group ? t("groups") : undefined}
        onAction={() => router.push("/(tabs)/groups")}
      />
      {!friends.length && (
        <Empty
          title={group ? t("emptyFriends") : t("joinFirst")}
          icon="people-outline"
        />
      )}
      {result.items.map((m) => {
        const days = (m.daysOff || [])
            .filter((d) =>
              date ? d.date === date : d.date >= localDate(now, d.zone),
            )
            .sort((a, b) => a.date.localeCompare(b.date)),
          open = expanded === m.id,
          dayResult = paginate(days, dayPage, 4);
        return (
          <View key={m.id}>
            <Press
              label={m.nickname + ", " + days.length + " " + t("allConfirmed")}
              onPress={() => {
                setExpanded(open ? null : m.id);
                setDayPage(1);
              }}
            >
              <Row style={{ paddingVertical: 14 }}>
                <Avatar person={m} size={42} />
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{m.nickname}</Txt>
                  <Txt muted size={12}>
                    {m.zone.split("/").at(-1)} · {time(now, m.zone)}
                  </Txt>
                  <Txt
                    size={12}
                    color={days.length ? colors.accent : colors.muted}
                  >
                    {days[0]
                      ? t("dayOffShort") +
                        " · " +
                        dayText(days[0].date, prefs.language, {
                          day: "numeric",
                          month: "short",
                          weekday: undefined,
                        })
                      : t("notConfirmed")}
                  </Txt>
                </View>
                <Icon
                  name={open ? "chevron-up" : "chevron-down"}
                  color={colors.muted}
                  size={18}
                />
              </Row>
            </Press>
            {open && (
              <View style={{ paddingLeft: 4, paddingBottom: 12 }}>
                {dayResult.items.map((d) => (
                  <DayOffRow key={d.date} day={d} member={m} />
                ))}
                {!days.length && (
                  <Txt size={12} muted>
                    {t("noConfirmedDaysDescription")}
                  </Txt>
                )}
                <Pager
                  page={dayResult.page}
                  pages={dayResult.pages}
                  onPage={setDayPage}
                />
              </View>
            )}
            <Divider />
          </View>
        );
      })}
      <Pager page={result.page} pages={result.pages} onPage={setPage} />
    </Card>
  );
}

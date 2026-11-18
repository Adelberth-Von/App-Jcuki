import React from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { GroupJourney } from "../../components/groupJourney";
import { GroupStart } from "../../components/groupStart";
import { useApp } from "../../store";
import {
  localDate,
  playingSlots,
  weekStart,
  zoneAbbreviation,
} from "../../lib/domain";
import { useMinuteClock } from "../../hooks/useMinuteClock";
import {
  Button,
  Card,
  Icon,
  Pill,
  Press,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from "../../components/ui";
import { AgendaList, dayText } from "../../components/schedule";
import { FriendsSchedule, MyDaysOff } from "../../components/daysOff";
import { WeekStrip } from "../../components/week";

export default function Dashboard() {
  const {
    onboarded,
    t,
    profile,
    zone,
    group,
    prefs,
    colors,
    offline,
    busy,
    demoMode,
    time,
    setOverlay,
  } = useApp();
  const now = useMinuteClock();
  const today = localDate(now, zone);
  const member = group?.members.find((m) => m.id === profile.id);
  const days = (member?.daysOff || [])
    .filter((d) => d.date >= localDate(now, d.zone))
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = days[0];
  const slots = next && member ? playingSlots(member.slots, next) : [];
  if (!onboarded) return <Redirect href="/welcome" />;
  if (!group)
    return (
      <Screen
        title={`${t("welcome")}, ${profile.nickname}.`}
        description={t("firstGroupWelcome")}
      >
        <GroupStart />
      </Screen>
    );

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Row between style={{ flexWrap: "wrap", gap: 8 }}>
          <Txt muted size={14}>
            {dayText(today, prefs.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Txt>
          {(offline || busy) && !demoMode && (
            <Pill
              label={t(offline ? "offline" : "syncing")}
              tone={offline ? "peach" : "muted"}
            />
          )}
        </Row>
        <Txt heading size={32} weight="semibold" style={{ letterSpacing: -1 }}>
          {t("welcome")}, {profile.nickname}.
        </Txt>
        <Press
          label={t("selectGroup") + ": " + group.name}
          onPress={() => router.navigate("/(tabs)/groups")}
          style={{ alignSelf: "flex-start", maxWidth: "100%" }}
        >
          <Row style={{ gap: 8 }}>
            <Icon name="people-outline" size={18} color={colors.accent} />
            <Txt size={14} weight="semibold" style={{ flexShrink: 1 }}>
              {group.name}
            </Txt>
            <Icon name="chevron-forward" size={16} color={colors.muted} />
          </Row>
        </Press>
      </View>

      <Card style={{ gap: 8, backgroundColor: colors.accentSoft }}>
        <Txt weight="semibold" color={colors.accent} size={14}>
          {t("nextDayOff")}
        </Txt>
        <Txt heading size={25} weight="semibold">
          {next
            ? dayText(next.date, prefs.language, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })
            : t("noConfirmedDays")}
        </Txt>
        {next && (
          <Txt muted size={14}>
            {slots.length
              ? slots
                  .map(
                    (s) =>
                      time(s.start) +
                      " – " +
                      time(s.end) +
                      (localDate(s.start, zone) !== localDate(s.end, zone)
                        ? " (+1)"
                        : ""),
                  )
                  .join(" · ")
              : t("noPlayTimeYet")}
          </Txt>
        )}
        {next && next.zone !== zone && (
          <Txt muted size={12}>
            {t("savedZone")}:{" "}
            {zoneAbbreviation(next.zone, next.date + "T12:00:00Z")}
            {slots.length > 0 &&
              " · " +
                t("yourTime") +
                ": " +
                zoneAbbreviation(zone, slots[0].start)}
            {slots.length > 0 && localDate(slots[0].start, zone) !== next.date
              ? " · " +
                dayText(localDate(slots[0].start, zone), prefs.language, {
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </Txt>
        )}
        <Button
          title={t(
            next
              ? slots.length
                ? "editPlayTime"
                : "addPlayTime"
              : "chooseDay",
          )}
          onPress={() =>
            next
              ? setOverlay({ kind: "slot", day: next.date, slot: slots[0] })
              : router.navigate("/(tabs)/calendar")
          }
          style={{ marginTop: 8 }}
        />
      </Card>

      <View>
        <SectionTitle
          title={t("thisWeek")}
          action={t("seeCalendar")}
          onAction={() => router.navigate("/(tabs)/calendar")}
        />
        <WeekStrip
          week={weekStart(today)}
          selected={today}
          today={today}
          onSelect={(day) =>
            router.navigate({ pathname: "/(tabs)/calendar", params: { day } })
          }
        />
      </View>
      <AgendaList />
      <GroupJourney />
      <FriendsSchedule />
      {days.length > 1 && <MyDaysOff omitFirst />}
    </Screen>
  );
}

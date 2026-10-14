import React from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { useApp } from "../../store";
import {
  localDate,
  playingSlots,
  weekStart,
  zoneAbbreviation,
} from "../../lib/domain";
import { useMinuteClock } from "../../hooks/useMinuteClock";
import {
  Card,
  Icon,
  Pill,
  Press,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from "../../components/ui";
import {
  AgendaList,
  dayText,
  DemoNotice,
  ReminderCard,
} from "../../components/schedule";
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
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Row between>
          <Txt muted size={13} style={{ flex: 1 }}>
            {dayText(today, prefs.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Txt>
          <Pill
            label={
              offline
                ? t("offline")
                : busy
                  ? t("syncing")
                  : zoneAbbreviation(zone, now)
            }
            tone={offline ? "peach" : "muted"}
            dot={offline || busy}
          />
        </Row>
        <Txt
          size={32}
          weight="semibold"
          heading
          style={{ letterSpacing: -1.3 }}
        >
          {t("welcome")}, {profile.nickname}.
        </Txt>
        <Txt muted size={14}>
          {t("welcomeDescription")}
        </Txt>
      </View>
      {group && (
        <Press
          label={t("selectGroup") + ": " + group.name}
          onPress={() => router.push("/(tabs)/groups")}
          style={{ alignSelf: "flex-start" }}
        >
          <Row style={{ gap: 8 }}>
            <Icon name="people-outline" size={18} color={colors.accent} />
            <Txt size={13} weight="semibold">
              {group.name}
            </Txt>
            <Txt size={12} muted>
              ·{" "}
              {demoMode
                ? t("demoBadge")
                : group.memberCount + " " + t("members")}
            </Txt>
            <Icon name="chevron-down" size={15} color={colors.muted} />
          </Row>
        </Press>
      )}
      <Card
        style={{
          backgroundColor: colors.hero,
          borderColor: colors.hero,
          padding: 24,
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          aria-hidden
          style={{
            position: "absolute",
            right: -24,
            top: -30,
            width: 150,
            height: 150,
            borderRadius: 75,
            borderWidth: 1,
            borderColor: colors.heroLine,
          }}
        />
        <Row style={{ gap: 8 }}>
          <Icon name="sunny-outline" color={colors.heroMuted} size={19} />
          <Txt size={12} weight="medium" color={colors.heroMuted}>
            {t("nextDayOff")}
          </Txt>
        </Row>
        <Txt
          size={28}
          weight="semibold"
          color={colors.onHero}
          style={{ marginTop: 18, letterSpacing: -0.9 }}
        >
          {next
            ? dayText(next.date, prefs.language, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })
            : t("noConfirmedDays")}
        </Txt>
        <Txt color={colors.heroMuted} size={14} style={{ marginTop: 7 }}>
          {next
            ? slots.length
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
              : t("noPlayTimeYet")
            : t("noConfirmedDaysDescription")}
        </Txt>
        {next && (
          <Txt color={colors.heroMuted} size={12} style={{ marginTop: 5 }}>
            {t("savedZone")}:{" "}
            {zoneAbbreviation(next.zone, next.date + "T12:00:00Z")}
            {slots.length
              ? " · " +
                t("yourTime") +
                ": " +
                zoneAbbreviation(zone, slots[0].start)
              : ""}
            {slots.length > 0 && localDate(slots[0].start, zone) !== next.date
              ? " · " +
                dayText(localDate(slots[0].start, zone), prefs.language, {
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </Txt>
        )}
        <Press
          label={t(
            next
              ? slots.length
                ? "editPlayTime"
                : "addPlayTime"
              : "chooseDay",
          )}
          onPress={() =>
            next
              ? setOverlay({ kind: "slot", day: next.date, slot: slots[0] })
              : router.push("/(tabs)/calendar")
          }
          style={{
            marginTop: 22,
            backgroundColor: colors.onHero,
            borderRadius: 16,
          }}
        >
          <Row between style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Txt
              size={14}
              weight="semibold"
              color={colors.hero}
              style={{ flex: 1 }}
            >
              {t(
                next
                  ? slots.length
                    ? "editPlayTime"
                    : "addPlayTime"
                  : "chooseDay",
              )}
            </Txt>
            <Icon name="arrow-forward" color={colors.hero} size={19} />
          </Row>
        </Press>
      </Card>
      <View>
        <SectionTitle
          title={t("thisWeek")}
          action={t("seeCalendar")}
          onAction={() => router.push("/(tabs)/calendar")}
        />
        <WeekStrip
          week={weekStart(today)}
          selected={today}
          onSelect={(day) =>
            router.push({ pathname: "/(tabs)/calendar", params: { day } })
          }
        />
        <Txt size={12} muted style={{ marginTop: 12 }}>
          {t("weekHint")}
        </Txt>
      </View>
      <DemoNotice />
      <FriendsSchedule />
      <AgendaList />
      {days.length > 1 && <MyDaysOff omitFirst />}
      <ReminderCard />
      <Txt muted size={12} style={{ textAlign: "center" }}>
        {t("signature")}
      </Txt>
    </Screen>
  );
}

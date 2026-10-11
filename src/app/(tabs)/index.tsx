import React from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { useApp } from "../../store";
import { localDate, zoneAbbreviation } from "../../lib/domain";
import { useMinuteClock } from "../../hooks/useMinuteClock";
import { Card, Icon, Pill, Row, Screen, Txt } from "../../components/ui";
import { dayText, DemoNotice, ReminderCard } from "../../components/schedule";
import {
  DayOffRow,
  FriendsSchedule,
  MyDaysOff,
} from "../../components/daysOff";
export default function Dashboard() {
  const { onboarded, t, profile, zone, group, prefs, colors, offline, busy } =
    useApp();
  const now = useMinuteClock(),
    member = group?.members.find((m) => m.id === profile.id);
  const next = member?.daysOff
    ?.filter((d) => d.date >= localDate(now, d.zone))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Screen
      action={{
        title: t("openCalendar"),
        icon: "calendar-outline",
        onPress: () => router.push("/(tabs)/calendar"),
      }}
    >
      <View style={{ gap: 10 }}>
        <Row between>
          <Txt muted size={12} style={{ flex: 1 }}>
            {dayText(localDate(now, zone), prefs.language, {
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
            dot={false}
          />
        </Row>
        <Txt size={30} weight="bold" heading style={{ letterSpacing: -1 }}>
          {t("welcome")}, {profile.nickname}.
        </Txt>
        <Txt muted size={14}>
          {t("welcomeDescription")}
        </Txt>
      </View>
      <DemoNotice />
      <Card
        style={{
          backgroundColor: colors.accentSoft,
          borderColor: colors.accentSoft,
        }}
      >
        <Row style={{ gap: 8 }}>
          <Icon name="calendar-outline" color={colors.accent} size={18} />
          <Txt size={12} weight="semibold" color={colors.accent}>
            {t("nextDayOff")}
          </Txt>
        </Row>
        {next && member ? (
          <DayOffRow day={next} member={member} editable />
        ) : (
          <View style={{ paddingTop: 12, gap: 5 }}>
            <Txt size={22} weight="bold">
              {t("noConfirmedDays")}
            </Txt>
            <Txt muted>{t("noConfirmedDaysDescription")}</Txt>
          </View>
        )}
      </Card>
      {(member?.daysOff?.filter((d) => d.date >= localDate(now, d.zone))
        .length || 0) > 1 && <MyDaysOff omitFirst />}
      <FriendsSchedule />
      <ReminderCard />
      <Txt muted size={12} style={{ textAlign: "center", paddingVertical: 8 }}>
        {t("signature")}
      </Txt>
    </Screen>
  );
}

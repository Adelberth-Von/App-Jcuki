import React, { useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "../../store";
import {
  addDays,
  localDate,
  weekStart,
  zoneAbbreviation,
} from "../../lib/domain";
import { Screen, Txt, Pill, Row } from "../../components/ui";
import {
  AgendaList,
  CircleCard,
  DemoNotice,
  ReminderCard,
  Suggestions,
  Upcoming,
  WeekStrip,
} from "../../components/schedule";
export default function Dashboard() {
  const {
    onboarded,
    t,
    profile,
    zone,
    setOverlay,
    offline,
    busy,
    widgetEnabled,
  } = useApp();
  const [selected, setSelected] = useState(() => localDate(Date.now(), zone));
  const start = weekStart(selected);
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Screen
      action={{
        title: t("addAvailability"),
        onPress: () => setOverlay({ kind: "slot" }),
        icon: "add",
      }}
    >
      <View>
        <Row between style={{ alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Txt size={11} muted>
              {t("welcomeDescription")}
            </Txt>
            <Txt
              size={29}
              weight="bold"
              heading
              style={{ letterSpacing: -1, marginTop: 4 }}
            >
              {t("welcome")}, {profile.nickname}
              <Txt size={29} color="#5B51D8">
                .
              </Txt>
            </Txt>
          </View>
          <Pill
            label={
              offline
                ? t("offline")
                : busy
                  ? t("syncing")
                  : zoneAbbreviation(zone)
            }
            tone={offline ? "peach" : "accent"}
          />
        </Row>
      </View>
      <DemoNotice />
      {widgetEnabled && <Upcoming />}
      <WeekStrip
        start={start}
        selected={selected}
        onSelect={setSelected}
        onWeek={(n) => setSelected(addDays(selected, n * 7))}
      />
      <Suggestions />
      <CircleCard />
      <AgendaList />
      <ReminderCard />
      <Txt size={10} muted style={{ textAlign: "center", paddingVertical: 8 }}>
        {t("signature")}
      </Txt>
    </Screen>
  );
}

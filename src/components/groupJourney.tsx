import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { localDate, playingSlots } from "../lib/domain";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { Button, Card, Txt } from "./ui";

/** One useful next action, derived from the group's actual saved state. */
export function GroupJourney() {
  const { group, profile, t, demoMode, setOverlay } = useApp();
  const now = useMinuteClock();
  if (!group || demoMode) return null;
  const own = group.members.find((member) => member.id === profile.id);
  const day = own?.daysOff?.find(
    (day) =>
      day.date >= localDate(now, day.zone) &&
      playingSlots(own.slots, day).some((slot) => Date.parse(slot.end) > now),
  );
  const next = [
    group.members.length > 1,
    !!day,
    group.events.some(
      (event) => !event.cancelled && Date.parse(event.end) > now,
    ),
  ].findIndex((done) => !done);
  if (next === -1) return null;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Txt heading size={18} weight="semibold">
          {t(
            ["journeyInviteTitle", "journeyScheduleTitle", "journeyPlanTitle"][
              next
            ],
          )}
        </Txt>
        <Txt muted size={14}>
          {t(
            ["journeyInviteHint", "journeyScheduleHint", "journeyPlanHint"][
              next
            ],
          )}
        </Txt>
      </View>
      <Button
        title={t(["shareInvitation", "fillMyCalendar", "journeyPlan"][next])}
        icon={(["people-outline", "calendar-outline", "add"] as const)[next]}
        kind="secondary"
        onPress={() =>
          next === 0
            ? router.navigate("/(tabs)/groups")
            : next === 1
              ? router.navigate("/(tabs)/calendar")
              : setOverlay({ kind: "event" })
        }
      />
    </Card>
  );
}

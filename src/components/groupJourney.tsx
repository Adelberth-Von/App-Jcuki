import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { localDate, playingSlots } from "../lib/domain";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { Button, Card, Icon, Row, Txt } from "./ui";

/** One useful next action, derived from the group's actual saved state. */
export function GroupJourney() {
  const { group, profile, t, colors, demoMode, setOverlay } = useApp();
  const now = useMinuteClock();
  if (!group || demoMode) return null;
  const own = group.members.find((member) => member.id === profile.id);
  const day = own?.daysOff?.find(
    (day) =>
      day.date >= localDate(now, day.zone) &&
      playingSlots(own.slots, day).some((slot) => Date.parse(slot.end) > now),
  );
  const done = [
    group.members.length > 1,
    !!day,
    group.events.some(
      (event) => !event.cancelled && Date.parse(event.end) > now,
    ),
  ];
  const next = done.findIndex((value) => !value);
  if (next === -1) return null;
  const completed = done.filter(Boolean).length;
  return (
    <Card style={{ gap: 16, borderColor: colors.accent + "44" }}>
      <Row between>
        <Txt size={12} color={colors.accent} weight="semibold">
          {t("journeyEyebrow")}
        </Txt>
        <Txt muted size={12}>
          {completed}/3
        </Txt>
      </Row>
      <Row style={{ gap: 5 }}>
        {done.map((value, index) => (
          <View key={index} style={{ flex: 1, gap: 7 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: value ? colors.accent : colors.line,
              }}
            />
            <Row style={{ gap: 4 }}>
              {value && (
                <Icon name="checkmark" size={12} color={colors.accent} />
              )}
              <Txt muted={!value} size={11}>
                {t(["journeyInvite", "journeySchedule", "journeyPlan"][index])}
              </Txt>
            </Row>
          </View>
        ))}
      </Row>
      <View style={{ gap: 6 }}>
        <Txt heading size={23} weight="semibold">
          {t(
            ["journeyInviteTitle", "journeyScheduleTitle", "journeyPlanTitle"][
              next
            ],
          )}
        </Txt>
        <Txt muted size={13}>
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

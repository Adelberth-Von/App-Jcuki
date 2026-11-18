import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarMonth, FriendsSchedule } from "../../components/daysOff";
import { GroupStart } from "../../components/groupStart";
import { dayText } from "../../components/schedule";
import {
  Button,
  Card,
  Icon,
  Press,
  Row,
  Screen,
  Txt,
} from "../../components/ui";
import { CalendarWeek } from "../../components/week";
import { useMinuteClock } from "../../hooks/useMinuteClock";
import { localDate, playingSlots, zoneAbbreviation } from "../../lib/domain";
import { useApp } from "../../store";

export default function Calendar() {
  const {
    t,
    prefs,
    zone,
    group,
    profile,
    setOverlay,
    time,
    colors,
    removeDayOff,
  } = useApp();
  const { day: requestedDay } = useLocalSearchParams<{ day?: string }>();
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const now = useMinuteClock();
  const today = localDate(now, zone);
  const selected =
    typeof requestedDay === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) &&
    Number.isFinite(Date.parse(requestedDay)) &&
    new Date(requestedDay).toISOString().slice(0, 10) === requestedDay
      ? requestedDay
      : today;
  function setSelected(date: string) {
    router.setParams({ day: date });
  }
  const mine = group?.members.find((m) => m.id === profile.id);
  const day = mine?.daysOff?.find((d) => d.date === selected);
  const slots = day ? playingSlots(mine?.slots || [], day) : [];
  const canEdit = !!day || selected >= today;

  if (!group)
    return (
      <Screen title={t("calendar")} description={t("calendarNeedsGroup")}>
        <GroupStart />
      </Screen>
    );
  return (
    <Screen
      title={t("calendar")}
      description={t("timeZone") + ": " + zoneAbbreviation(zone, now)}
    >
      <View style={{ gap: 8 }}>
        <View
          role="tablist"
          style={{
            flexDirection: "row",
            alignItems: "stretch",
            backgroundColor: colors.surfaceAlt,
            borderRadius: 16,
            padding: 4,
            gap: 4,
          }}
        >
          {(["weekly", "monthly"] as const).map((mode) => (
            <Press
              key={mode}
              role="tab"
              selected={view === mode}
              label={t(mode)}
              onPress={() => setView(mode)}
              style={{
                flex: 1,
                borderRadius: 12,
                backgroundColor: view === mode ? colors.surface : "transparent",
              }}
            >
              <Txt
                size={14}
                weight="semibold"
                color={view === mode ? colors.accent : colors.muted}
                style={{ textAlign: "center", padding: 8 }}
              >
                {t(mode)}
              </Txt>
            </Press>
          ))}
        </View>
        {view === "weekly" ? (
          <CalendarWeek
            selected={selected}
            today={today}
            onSelect={setSelected}
          />
        ) : (
          <CalendarMonth
            selected={selected}
            today={today}
            onSelect={setSelected}
          />
        )}
      </View>

      <Card style={{ gap: 8 }}>
        <Txt size={21} weight="semibold" heading>
          {dayText(selected, prefs.language, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Txt>
        <Row style={{ gap: 8 }}>
          <Icon
            name={day ? "checkmark-circle-outline" : "ellipse-outline"}
            color={day ? colors.accent : colors.muted}
            size={18}
          />
          <Txt
            muted={!day}
            color={day ? colors.accent : undefined}
            size={14}
            style={{ flex: 1 }}
          >
            {t(day ? "confirmedDayOff" : "notConfirmed")}
          </Txt>
        </Row>

        {day && (
          <View style={{ marginTop: 4, gap: 4 }}>
            <Txt weight="semibold" size={14}>
              {t("playTime")}
            </Txt>
            {slots.length === 0 && (
              <Txt muted size={14}>
                {t("noPlayTimeYet")}
              </Txt>
            )}
            {slots.map((slot) => {
              const startDate = localDate(slot.start, zone);
              const slotTime =
                time(slot.start) +
                " – " +
                time(slot.end) +
                (localDate(slot.end, zone) !== startDate ? " (+1)" : "");
              return (
                <Press
                  key={slot.id}
                  label={slotTime + ", " + t("editPlayTime")}
                  onPress={() =>
                    setOverlay({ kind: "slot", day: selected, slot })
                  }
                >
                  <Row between>
                    <View style={{ flex: 1 }}>
                      <Txt size={16} weight="semibold">
                        {slotTime}
                      </Txt>
                      {startDate !== selected && (
                        <Txt muted size={12}>
                          {dayText(startDate, prefs.language, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </Txt>
                      )}
                    </View>
                    <Icon
                      name="create-outline"
                      color={colors.accent}
                      size={20}
                    />
                  </Row>
                </Press>
              );
            })}
            {day.zone !== zone && (
              <Txt muted size={12}>
                {t("savedZone")}:{" "}
                {zoneAbbreviation(day.zone, day.date + "T12:00:00Z")}
              </Txt>
            )}
          </View>
        )}
        {canEdit && (
          <Button
            title={t(
              day
                ? slots.length
                  ? "addAnotherPlayTime"
                  : "addPlayTime"
                : "setDayOff",
            )}
            onPress={() => setOverlay({ kind: "slot", day: selected })}
            style={{ marginTop: 8 }}
          />
        )}
        {day && (
          <Button
            title={t("removeDayOff")}
            kind="text"
            textColor={colors.danger}
            onPress={() =>
              setOverlay({
                kind: "confirm",
                title: t("removeDayOff"),
                description: t("removeDayOffDescription"),
                onConfirm: () => removeDayOff(selected),
              })
            }
          />
        )}
      </Card>
      <FriendsSchedule date={selected} />
    </Screen>
  );
}

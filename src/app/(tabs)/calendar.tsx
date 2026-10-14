import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CalendarWeek } from "../../components/week";
import { useApp } from "../../store";
import { localDate, playingSlots, zoneAbbreviation } from "../../lib/domain";
import { useMinuteClock } from "../../hooks/useMinuteClock";
import {
  Button,
  Card,
  Icon,
  Pill,
  Press,
  Row,
  Screen,
  Txt,
} from "../../components/ui";
import { dayText } from "../../components/schedule";
import { CalendarMonth, FriendsSchedule } from "../../components/daysOff";
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
  const validRequestedDay =
    typeof requestedDay === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) &&
    Number.isFinite(Date.parse(requestedDay)) &&
    new Date(requestedDay).toISOString().slice(0, 10) === requestedDay
      ? requestedDay
      : undefined;
  const [selection, setSelection] = useState(() => ({
    request: requestedDay,
    date: validRequestedDay || localDate(Date.now(), zone),
  }));
  const now = useMinuteClock();
  const selected =
    selection.request === requestedDay
      ? selection.date
      : validRequestedDay || localDate(now, zone);
  function setSelected(date: string) {
    setSelection({ request: requestedDay, date });
  }
  const mine = group?.members.find((m) => m.id === profile.id),
    day = mine?.daysOff?.find((d) => d.date === selected),
    slots = day ? playingSlots(mine?.slots || [], day) : [];
  function open(date = selected) {
    if (!group) {
      setOverlay({ kind: "joinGroup" });
      return;
    }
    const confirmed = mine?.daysOff?.find((d) => d.date === date);
    setOverlay(
      confirmed
        ? {
            kind: "slot",
            day: date,
            slot: playingSlots(mine?.slots || [], confirmed)[0],
          }
        : { kind: "slot", day: date },
    );
  }
  return (
    <Screen
      title={t("calendar")}
      description={t("calendarHint")}
      action={
        selected < localDate(now, day?.zone || zone) && !day
          ? undefined
          : {
              title: t(
                day
                  ? slots.length
                    ? "addAnotherPlayTime"
                    : "addPlayTime"
                  : "confirmDayOff",
              ),
              icon: day ? "time-outline" : "checkmark",
              onPress: () =>
                day ? setOverlay({ kind: "slot", day: selected }) : open(),
            }
      }
    >
      <Pill
        label={zone.split("/").at(-1) + " · " + zoneAbbreviation(zone, now)}
        tone="muted"
        dot={false}
      />
      <Row
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: 18,
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
              borderRadius: 14,
              backgroundColor: view === mode ? colors.surface : "transparent",
            }}
          >
            <Row
              style={{ justifyContent: "center", gap: 8, paddingVertical: 12 }}
            >
              <Icon
                name={mode === "weekly" ? "albums-outline" : "calendar-outline"}
                size={17}
                color={view === mode ? colors.accent : colors.muted}
              />
              <Txt
                size={14}
                weight="semibold"
                color={view === mode ? colors.accent : colors.muted}
              >
                {t(mode)}
              </Txt>
            </Row>
          </Press>
        ))}
      </Row>
      {view === "weekly" ? (
        <CalendarWeek
          selected={selected}
          onSelect={(date) => {
            setSelected(date);
            open(date);
          }}
        />
      ) : (
        <CalendarMonth
          selected={selected}
          onSelect={(date) => {
            setSelected(date);
            open(date);
          }}
        />
      )}
      <Card>
        <Txt size={12} muted weight="medium" style={{ marginBottom: 12 }}>
          {t("selectedDay")}
        </Txt>
        <View style={{ gap: 4 }}>
          <Txt size={20} weight="bold" heading>
            {dayText(selected, prefs.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Txt>
          <Row style={{ gap: 6 }}>
            <Icon
              name={day ? "checkmark-circle" : "ellipse-outline"}
              color={day ? colors.accent : colors.muted}
              size={16}
            />
            <Txt muted={!day} color={day ? colors.accent : undefined} size={12}>
              {t(day ? "confirmedDayOff" : "notConfirmed")}
            </Txt>
          </Row>
        </View>
        <View
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            gap: 10,
          }}
        >
          <Txt weight="semibold" size={13}>
            {t("playTime")}
          </Txt>
          {slots.map((s) => (
            <Press
              key={s.id}
              label={
                time(s.start) + " – " + time(s.end) + ", " + t("editPlayTime")
              }
              onPress={() =>
                setOverlay({ kind: "slot", day: selected, slot: s })
              }
            >
              <Row between>
                <Txt size={21} weight="semibold" style={{ flex: 1 }}>
                  {time(s.start)} – {time(s.end)}
                  {localDate(s.end, day!.zone) !== day!.date ? " (+1)" : ""}
                </Txt>
                <Icon name="create-outline" color={colors.accent} size={20} />
              </Row>
            </Press>
          ))}
          {!slots.length && (
            <Txt muted size={14}>
              {day ? t("noPlayTimeYet") : t("dayOffRequired")}
            </Txt>
          )}
          {day && (
            <Txt muted size={12}>
              {t("savedZone")}: {day.zone}
              {slots.length ? " · " + t("yourTime") + ": " + zone : ""}
            </Txt>
          )}
        </View>
        {day && (
          <Button
            title={t("removeDayOff")}
            kind="text"
            icon="close-circle-outline"
            style={{ marginTop: 12 }}
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

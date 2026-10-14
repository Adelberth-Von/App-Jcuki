import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useApp } from "../store";
import { addDays, localDate, weekStart } from "../lib/domain";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { Card, Icon, IconButton, Press, Row, Txt } from "./ui";
import { dayText } from "./schedule";

export function WeekStrip({
  week,
  selected,
  onSelect,
}: {
  week: string;
  selected: string;
  onSelect: (day: string) => void;
}) {
  const { colors, prefs, group, profile, zone, t } = useApp();
  const [width, setWidth] = useState(0);
  const today = localDate(useMinuteClock(), zone);
  const mine = group?.members.find((m) => m.id === profile.id);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={width < 342}
        contentContainerStyle={{ flexGrow: 1, gap: 1 }}
      >
        {Array.from({ length: 7 }, (_, i) => {
          const date = addDays(week, i);
          const confirmed = mine?.daysOff?.some((d) => d.date === date);
          const active = selected === date;
          return (
            <Press
              key={date}
              selected={active}
              disabled={date < today && !confirmed}
              label={
                dayText(date, prefs.language, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }) +
                ", " +
                t(confirmed ? "confirmedDayOff" : "notConfirmed")
              }
              onPress={() => onSelect(date)}
              style={{
                flex: 1,
                minWidth: 48,
                borderRadius: 18,
                backgroundColor: active
                  ? colors.accent
                  : confirmed
                    ? colors.accentSoft
                    : colors.surfaceAlt,
              }}
            >
              <View
                style={{
                  minHeight: 90,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  paddingVertical: 8,
                }}
              >
                <Txt size={12} color={active ? colors.onAccent : colors.muted}>
                  {dayText(date, prefs.language, {
                    weekday: "short",
                    day: undefined,
                    month: undefined,
                  })}
                </Txt>
                <Txt
                  size={20}
                  weight="semibold"
                  color={active ? colors.onAccent : colors.text}
                >
                  {Number(date.slice(-2))}
                </Txt>
                {confirmed ? (
                  <Icon
                    name="checkmark-circle"
                    size={13}
                    color={active ? colors.onAccent : colors.accent}
                  />
                ) : (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      marginVertical: 4,
                      borderRadius: 3,
                      backgroundColor:
                        date === today
                          ? active
                            ? colors.onAccent
                            : colors.accent
                          : "transparent",
                    }}
                  />
                )}
              </View>
            </Press>
          );
        })}
      </ScrollView>
      {width > 0 && width < 342 && (
        <Txt size={12} muted style={{ marginTop: 10, paddingHorizontal: 4 }}>
          {t("calendarScroll")}
        </Txt>
      )}
    </View>
  );
}

export function CalendarWeek({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (day: string) => void;
}) {
  const { t, prefs, colors, zone } = useApp();
  const [view, setView] = useState(() => ({
    selection: selected,
    week: weekStart(selected),
  }));
  const week = view.selection === selected ? view.week : weekStart(selected);
  function setWeek(next: string) {
    setView({ selection: selected, week: next });
  }
  const range =
    dayText(week, prefs.language, {
      weekday: undefined,
      day: "numeric",
      month: "short",
      year:
        week.slice(0, 4) !== addDays(week, 6).slice(0, 4)
          ? "numeric"
          : undefined,
    }) +
    " – " +
    dayText(addDays(week, 6), prefs.language, {
      weekday: undefined,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return (
    <Card style={{ paddingHorizontal: 0 }}>
      <Row between style={{ gap: 2, marginBottom: 14, paddingHorizontal: 6 }}>
        <IconButton
          icon="chevron-back"
          label={t("previousWeek")}
          onPress={() => setWeek(addDays(week, -7))}
        />
        <Txt
          size={14}
          weight="semibold"
          style={{ flex: 1, textAlign: "center" }}
        >
          {range}
        </Txt>
        <IconButton
          icon="chevron-forward"
          label={t("nextWeek")}
          onPress={() => setWeek(addDays(week, 7))}
        />
      </Row>
      <WeekStrip week={week} selected={selected} onSelect={onSelect} />
      <Row between style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <Row style={{ flex: 1, gap: 6 }}>
          <Icon name="checkmark-circle" color={colors.accent} size={15} />
          <Txt muted size={12} style={{ flex: 1 }}>
            {t("confirmedDayOff")}
          </Txt>
        </Row>
        <Press
          label={t("today")}
          onPress={() => onSelect(localDate(Date.now(), zone))}
        >
          <Txt size={13} weight="semibold" color={colors.accent}>
            {t("today")}
          </Txt>
        </Press>
      </Row>
    </Card>
  );
}

import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useApp } from "../store";
import { addDays, weekStart } from "../lib/domain";
import { Card, Icon, IconButton, Press, Row, Txt } from "./ui";
import { dayText } from "./schedule";

export function WeekStrip({
  week,
  selected,
  today,
  onSelect,
}: {
  week: string;
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const { colors, prefs, group, profile, t } = useApp();
  const [width, setWidth] = useState(0);
  const mine = group?.members.find((m) => m.id === profile.id);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={width > 0 && width < 336}
        contentContainerStyle={{ flexGrow: 1 }}
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
              }}
            >
              <View
                style={{
                  minHeight: 72,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  marginHorizontal: 2,
                  paddingVertical: 8,
                  backgroundColor: active
                    ? colors.accent
                    : confirmed
                      ? colors.accentSoft
                      : colors.surface,
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
                    name="checkmark-circle-outline"
                    size={14}
                    color={active ? colors.onAccent : colors.accent}
                  />
                ) : (
                  <View
                    style={{
                      width: 6,
                      height: 6,
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
      {width > 0 && width < 336 && (
        <Txt size={12} muted style={{ marginTop: 8, paddingHorizontal: 12 }}>
          {t("calendarScroll")}
        </Txt>
      )}
    </View>
  );
}

export function CalendarWeek({
  selected,
  today,
  onSelect,
}: {
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const { t, prefs, colors } = useApp();
  const [view, setView] = useState(() => ({
    selection: selected,
    week: weekStart(selected),
  }));
  const week = view.selection === selected ? view.week : weekStart(selected);
  const end = addDays(week, 6);
  function setWeek(next: string) {
    setView({ selection: selected, week: next });
  }
  const range =
    dayText(week, prefs.language, {
      weekday: undefined,
      day: "numeric",
      month: "short",
      year: week.slice(0, 4) !== end.slice(0, 4) ? "numeric" : undefined,
    }) +
    " – " +
    dayText(end, prefs.language, {
      weekday: undefined,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return (
    <Card style={{ paddingHorizontal: 0, paddingVertical: 4 }}>
      <Row between style={{ gap: 4, marginBottom: 8, paddingHorizontal: 4 }}>
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
      <WeekStrip
        week={week}
        selected={selected}
        today={today}
        onSelect={onSelect}
      />
      <Row between style={{ paddingHorizontal: 12, marginTop: 4 }}>
        <Row style={{ flex: 1, gap: 8 }}>
          <Icon
            name="checkmark-circle-outline"
            color={colors.accent}
            size={16}
          />
          <Txt muted size={12} style={{ flex: 1 }}>
            {t("confirmedDayOff")}
          </Txt>
        </Row>
        <Press
          label={t("today")}
          onPress={() => {
            setWeek(weekStart(today));
            onSelect(today);
          }}
        >
          <Txt size={14} weight="semibold" color={colors.accent}>
            {t("today")}
          </Txt>
        </Press>
      </Row>
    </Card>
  );
}

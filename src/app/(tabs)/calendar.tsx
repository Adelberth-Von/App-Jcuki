import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../../store";
import {
  addDays,
  availabilityForDay,
  localDate,
  weekStart,
} from "../../lib/domain";
import {
  Avatar,
  Card,
  Divider,
  Empty,
  Icon,
  Press,
  Row,
  Screen,
  SectionTitle,
  Txt,
  Pill,
} from "../../components/ui";
import { dayText, WeekStrip } from "../../components/schedule";
export default function Calendar() {
  const { t, prefs, zone, group, profile, setOverlay, time, colors } = useApp();
  const [selected, setSelected] = useState(() => localDate(Date.now(), zone));
  const mine = group?.members.find((m) => m.id === profile.id),
    slots = availabilityForDay(mine?.slots || [], selected, zone);
  return (
    <Screen
      title={t("calendar")}
      description={t("slotDescription")}
      action={{
        title: t("addAvailability"),
        onPress: () => setOverlay({ kind: "slot", day: selected }),
      }}
    >
      <WeekStrip
        start={weekStart(selected)}
        selected={selected}
        onSelect={setSelected}
        onWeek={(n) => setSelected(addDays(selected, n * 7))}
      />
      <Card>
        <SectionTitle
          title={dayText(selected, prefs.language, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        />
        {slots.length ? (
          slots.map((s) => (
            <Press
              key={s.id}
              label={`${t(s.status)} ${time(s.start)} ${time(s.end)} ${t("edit")}`}
              onPress={() => setOverlay({ kind: "slot", slot: s })}
            >
              <Row
                style={{
                  paddingVertical: 14,
                  borderBottomColor: colors.line,
                  borderBottomWidth: 1,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 40,
                    borderRadius: 3,
                    backgroundColor:
                      s.status === "yes"
                        ? colors.green
                        : s.status === "maybe"
                          ? colors.peachText
                          : colors.muted,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Txt size={16} weight="semibold">
                    {time(s.start)} – {time(s.end)}
                  </Txt>
                  <Txt size={11} muted>
                    {t("yourTime")} · {zone.split("/").at(-1)}
                  </Txt>
                </View>
                <Pill
                  label={t(s.status)}
                  tone={
                    s.status === "yes"
                      ? "green"
                      : s.status === "maybe"
                        ? "peach"
                        : "muted"
                  }
                />
                <Icon name="create-outline" color={colors.accent} size={19} />
              </Row>
            </Press>
          ))
        ) : (
          <Empty
            title={t("emptyDay")}
            action={{
              title: t("addAvailability"),
              onPress: () => setOverlay({ kind: "slot", day: selected }),
            }}
          />
        )}
      </Card>
      <Card>
        <SectionTitle
          title={t("otherMembers")}
          description={t("yourTime") + " · " + zone.split("/").at(-1)}
        />
        {group?.members
          .filter((m) => m.id !== profile.id)
          .map((m) => {
            const list = availabilityForDay(m.slots, selected, zone);
            return (
              <View key={m.id} style={{ paddingVertical: 15, gap: 12 }}>
                <Row>
                  <Avatar person={m} />
                  <View style={{ flex: 1 }}>
                    <Txt weight="semibold" size={13}>
                      {m.nickname}
                    </Txt>
                    <Txt size={10} muted>
                      {m.zone.split("/").at(-1)}
                    </Txt>
                  </View>
                  <Pill
                    label={list.length ? t(list[0].status) : t("notFilled")}
                    tone={list[0]?.status === "yes" ? "green" : "muted"}
                  />
                </Row>
                {list.map((s) => (
                  <Row key={s.id} between style={{ marginLeft: 54 }}>
                    <Txt size={12} muted>
                      {time(s.start)} – {time(s.end)}
                    </Txt>
                    <Txt
                      size={10}
                      color={s.status === "yes" ? colors.green : colors.muted}
                    >
                      {t(s.status)}
                    </Txt>
                  </Row>
                ))}
                <Divider />
              </View>
            );
          })}
        {!group && <Empty title={t("joinFirst")} icon="people-outline" />}
      </Card>
    </Screen>
  );
}

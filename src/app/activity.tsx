import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { paginate } from "../lib/domain";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Empty,
  Icon,
  Pager,
  Press,
  Row,
  Screen,
  Txt,
} from "../components/ui";
import type { Activity, ActivityKind } from "../lib/types";
const icons: Record<ActivityKind, React.ComponentProps<typeof Icon>["name"]> = {
  member_joined: "people-outline",
  schedule_updated: "calendar-outline",
  event_created: "sparkles-outline",
  response_updated: "checkmark-circle-outline",
  event_cancelled: "close-circle-outline",
  profile_updated: "person-outline",
};
export default function ActivityScreen() {
  const {
    t,
    group,
    activities,
    activityMore,
    activityLoading,
    activityError,
    loadMoreActivity,
    markActivityRead,
    colors,
    date,
    time,
    setOverlay,
    refreshActivity,
    demoMode,
  } = useApp();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const firstId = activities[0]?.id;
  useEffect(() => {
    const timer = setTimeout(markActivityRead, 0);
    return () => clearTimeout(timer);
  }, [markActivityRead, group?.id, firstId]);
  const items = activities.filter(
    (a) =>
      filter === "all" ||
      (filter === "plans"
        ? ["event_created", "response_updated", "event_cancelled"].includes(
            a.kind,
          )
        : a.kind === "schedule_updated"),
  );
  const result = paginate(items, page, 4);
  function open(item: Activity) {
    if (item.eventId && group?.events.some((e) => e.id === item.eventId))
      setOverlay({ kind: "details", id: item.eventId });
  }
  return (
    <Screen
      back
      title={t("activityTitle")}
      description={
        group ? group.name + " · " + t("activityIntro") : t("joinFirst")
      }
    >
      <Row style={{ gap: 8 }}>
        {["all", "plans", "schedules"].map((value) => (
          <Press
            key={value}
            selected={filter === value}
            label={t(value)}
            onPress={() => {
              setFilter(value);
              setPage(1);
            }}
            style={{
              borderRadius: 30,
              backgroundColor:
                filter === value ? colors.accentSoft : colors.surfaceAlt,
            }}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Txt
                size={13}
                weight="semibold"
                color={filter === value ? colors.accent : colors.muted}
              >
                {t(value)}
              </Txt>
            </View>
          </Press>
        ))}
      </Row>
      <Card>
        {result.items.map((item, index) => {
          const person = group?.members.find(
            (member) => member.id === item.actorId,
          ) || { nickname: item.actorName };
          const content = (
            <Row
              style={{
                alignItems: "flex-start",
                paddingVertical: 18,
                gap: 14,
              }}
            >
              <View>
                <Avatar person={person} size={44} />
                <View
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    backgroundColor: colors.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}
                >
                  <Icon
                    name={icons[item.kind]}
                    size={13}
                    color={colors.accent}
                  />
                </View>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt size={15} weight="semibold">
                  {item.actorName}
                </Txt>
                <Txt size={14}>{t("activity_" + item.kind)}</Txt>
                <Txt muted size={12}>
                  {date(item.createdAt)} · {time(item.createdAt)}
                </Txt>
              </View>
              {item.eventId && (
                <Icon name="chevron-forward" color={colors.muted} size={18} />
              )}
            </Row>
          );
          const actionable =
            !!item.eventId &&
            group?.events.some((event) => event.id === item.eventId);
          return (
            <View key={item.id}>
              {actionable ? (
                <Press
                  label={item.actorName + " " + t("activity_" + item.kind)}
                  onPress={() => open(item)}
                >
                  {content}
                </Press>
              ) : (
                content
              )}
              {index < result.items.length - 1 && <Divider />}
            </View>
          );
        })}
        {!items.length && (
          <Empty
            title={t("activityEmpty")}
            description={t("activityEmptyHint")}
            icon="notifications-outline"
          />
        )}
        <Pager page={result.page} pages={result.pages} onPage={setPage} />
        {activityMore && (
          <Button
            title={t("loadMore")}
            kind="soft"
            disabled={activityLoading}
            onPress={() => void loadMoreActivity()}
          />
        )}
      </Card>
      {activityError && (
        <Card>
          <Txt muted>{t("activityRetryHint")}</Txt>
          <Button
            title={t("retry")}
            kind="soft"
            onPress={() => void refreshActivity()}
          />
        </Card>
      )}
      <Txt muted size={12} style={{ textAlign: "center" }}>
        {t(demoMode ? "demoNotice" : "activityPrivacy")}
      </Txt>
    </Screen>
  );
}

import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
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
import { GroupStart } from "../components/groupStart";

const filters = ["all", "plans", "schedules"] as const;

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
  } = useApp();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const firstId = activities[0]?.id;
  useEffect(() => {
    const timer = setTimeout(markActivityRead, 0);
    return () => clearTimeout(timer);
  }, [markActivityRead, group?.id, firstId]);
  const items = activities.filter(({ kind }) => {
    if (filter === "all") return true;
    if (filter === "schedules") return kind === "schedule_updated";
    return (
      kind === "event_created" ||
      kind === "response_updated" ||
      kind === "event_cancelled"
    );
  });
  const result = paginate(items, page, 4);

  return (
    <Screen back title={t("activityTitle")} description={group?.name}>
      {!group ? (
        <GroupStart />
      ) : (
        <>
          <View
            accessibilityRole="tablist"
            style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}
          >
            {filters.map((value) => (
              <Press
                key={value}
                role="tab"
                selected={filter === value}
                label={t(value)}
                onPress={() => {
                  setFilter(value);
                  setPage(1);
                }}
                style={{
                  borderRadius: 24,
                  backgroundColor:
                    filter === value ? colors.accentSoft : colors.surfaceAlt,
                }}
              >
                <Txt
                  size={14}
                  weight="semibold"
                  color={filter === value ? colors.accent : colors.text}
                  style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  {t(value)}
                </Txt>
              </Press>
            ))}
          </View>
          <Card>
            {result.items.map((item, index) => {
              const person = group.members.find(
                (member) => member.id === item.actorId,
              ) ?? { nickname: item.actorName };
              const eventId = item.eventId;
              const actionable =
                !!eventId && group.events.some((event) => event.id === eventId);
              const message = t("activity_" + item.kind);
              const timestamp =
                date(item.createdAt) + " · " + time(item.createdAt);
              const content = (
                <Row
                  style={{ alignItems: "center", paddingVertical: 12, gap: 12 }}
                >
                  <Avatar person={person} size={40} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt size={15}>
                      <Txt size={15} weight="semibold">
                        {item.actorName}
                      </Txt>{" "}
                      {message}
                    </Txt>
                    <Txt muted size={13}>
                      {timestamp}
                    </Txt>
                  </View>
                  {actionable && (
                    <Icon
                      name="chevron-forward"
                      color={colors.muted}
                      size={18}
                    />
                  )}
                </Row>
              );
              return (
                <View key={item.id}>
                  {index > 0 && <Divider />}
                  {actionable ? (
                    <Press
                      label={`${item.actorName} ${message} ${timestamp}`}
                      onPress={() =>
                        setOverlay({ kind: "details", id: eventId })
                      }
                    >
                      {content}
                    </Press>
                  ) : (
                    content
                  )}
                </View>
              );
            })}
            {activityError ? (
              <View style={{ gap: 8, paddingVertical: 8 }}>
                <View accessibilityRole="alert">
                  <Txt color={colors.peachText}>{t("activityRetryHint")}</Txt>
                </View>
                <Button
                  title={t(activityLoading ? "activityLoading" : "retry")}
                  disabled={activityLoading}
                  kind="secondary"
                  onPress={() => void refreshActivity()}
                />
              </View>
            ) : (
              !items.length &&
              (activityLoading ? (
                <Row style={{ paddingVertical: 12 }}>
                  <ActivityIndicator color={colors.accent} />
                  <Txt muted style={{ flex: 1 }}>
                    {t("activityLoading")}
                  </Txt>
                </Row>
              ) : (
                <Empty
                  title={t("activityEmpty")}
                  description={
                    filter === "all" ? t("activityEmptyHint") : undefined
                  }
                  icon="notifications-outline"
                />
              ))
            )}
            <Pager page={result.page} pages={result.pages} onPage={setPage} />
            {activityMore && (
              <Button
                title={t(activityLoading ? "activityLoading" : "loadMore")}
                kind="text"
                disabled={activityLoading}
                onPress={() => void loadMoreActivity()}
              />
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

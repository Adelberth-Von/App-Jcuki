import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../store";
import { paginate } from "../../lib/domain";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Icon,
  Pager,
  Pill,
  Press,
  Row,
  Screen,
  Txt,
} from "../../components/ui";
export default function Groups() {
  const {
    t,
    groups,
    group,
    demoMode,
    colors,
    setOverlay,
    switchGroup,
    moreGroups,
    loadMoreGroups,
    busy,
  } = useApp();
  const [page, setPage] = useState(1),
    p = paginate(groups, page, 4);
  return (
    <Screen
      title={t("groups")}
      description={t("groupsDescription")}
      action={{
        title: t("createGroup"),
        onPress: () => setOverlay({ kind: "createGroup" }),
        icon: "people-outline",
      }}
    >
      <Row>
        <Button
          title={t("joinGroup")}
          icon="enter-outline"
          kind="secondary"
          style={{ flex: 1 }}
          onPress={() => setOverlay({ kind: "joinGroup" })}
        />
        {group && (
          <Button
            title={t("invite")}
            kind="soft"
            style={{ flex: 1 }}
            onPress={() => setOverlay({ kind: "invite" })}
          />
        )}
      </Row>
      {p.items.length ? (
        p.items.map((g) => (
          <Press
            key={g.id}
            label={g.name + (g.id === group?.id ? ", " + t("activeGroup") : "")}
            selected={g.id === group?.id}
            disabled={busy}
            onPress={() => {
              void switchGroup(g.id)
                .then(() => router.push("/(tabs)"))
                .catch(() => {});
            }}
            style={{ borderRadius: 24 }}
          >
            <Card
              style={{
                borderColor: g.id === group?.id ? colors.accent : colors.line,
                backgroundColor:
                  g.id === group?.id ? colors.accentSoft : colors.surface,
              }}
            >
              <Row between>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    backgroundColor: colors.accentSoft,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Icon name="people-outline" color={colors.accent} size={27} />
                </View>
                <Pill
                  label={
                    demoMode
                      ? t("demoBadge")
                      : g.id === group?.id
                        ? t("activeGroup")
                        : t("cloud")
                  }
                  tone={demoMode ? "peach" : "green"}
                />
              </Row>
              <Txt
                size={24}
                weight="semibold"
                heading
                style={{ marginTop: 20, letterSpacing: -0.5 }}
              >
                {g.name}
              </Txt>
              <Txt size={12} muted style={{ marginTop: 3 }}>
                {g.memberCount} {t("members")}
              </Txt>
              <Row between style={{ marginTop: 20 }}>
                <Row style={{ gap: 4, flex: 1 }}>
                  {g.id === group?.id ? (
                    group.members
                      .slice(0, 4)
                      .map((m) => <Avatar key={m.id} person={m} size={32} />)
                  ) : (
                    <Txt size={11} muted>
                      {t("seeCalendar")}
                    </Txt>
                  )}
                </Row>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.surface,
                  }}
                >
                  <Icon name="arrow-forward" color={colors.accent} />
                </View>
              </Row>
            </Card>
          </Press>
        ))
      ) : (
        <Card>
          <Empty
            title={t("noGroups")}
            description={t("noGroupsDescription")}
            icon="people-outline"
            action={{
              title: t("joinGroup"),
              onPress: () => setOverlay({ kind: "joinGroup" }),
            }}
          />
        </Card>
      )}
      <Pager page={p.page} pages={p.pages} onPage={setPage} />
      {moreGroups && (
        <Button
          title={t("loadMore")}
          kind="secondary"
          onPress={() => void loadMoreGroups().catch(() => {})}
          disabled={busy}
        />
      )}
      <Txt size={11} muted style={{ textAlign: "center" }}>
        {t("privacy")}
      </Txt>
    </Screen>
  );
}

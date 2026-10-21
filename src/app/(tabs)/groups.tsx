import * as Clipboard from "expo-clipboard";
import { invitationLink } from "../../lib/invitations";
import React, { useState } from "react";
import { Share, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../store";
import { paginate } from "../../lib/domain";
import {
  Avatar,
  Button,
  Card,
  Icon,
  Pager,
  Pill,
  Press,
  Row,
  Screen,
  Txt,
} from "../../components/ui";
import { GroupStart } from "../../components/groupStart";
export default function Groups() {
  const {
    t,
    notify,
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
  const copy = (value: string) =>
    void Clipboard.setStringAsync(value)
      .then(() => notify("copied"))
      .catch(() => notify("error"));
  return (
    <Screen
      title={t("groups")}
      description={t(group ? "groupActiveHint" : "firstGroupWelcome")}
    >
      {!groups.length ? (
        <GroupStart />
      ) : (
        <>
          {group && !demoMode && (
            <Card
              style={{
                backgroundColor: colors.hero,
                borderColor: colors.hero,
                padding: 20,
                gap: 16,
              }}
            >
              <Row between>
                <Pill label={t("activeGroup")} tone="green" />
                <Txt color={colors.heroMuted} size={12}>
                  {group.members.length} {t("members")}
                </Txt>
              </Row>
              <View style={{ gap: 8 }}>
                <Txt heading color={colors.onHero} size={29} weight="semibold">
                  {group.name}
                </Txt>
                <Txt color={colors.heroMuted} size={13}>
                  {t("circleNextHint")}
                </Txt>
              </View>
              <Press
                label={t("copy") + ": " + t("inviteCode")}
                onPress={() => copy(group.code)}
                style={{
                  backgroundColor: "#FFFFFF12",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Row between style={{ gap: 8 }}>
                  <View style={{ gap: 6, flex: 1 }}>
                    <Txt color={colors.heroMuted} size={11}>
                      {t("inviteCode")}
                    </Txt>
                    <Txt
                      color={colors.onHero}
                      weight="semibold"
                      size={20}
                      style={{ letterSpacing: 0.8 }}
                    >
                      {group.code}
                    </Txt>
                  </View>
                  <Icon
                    name="copy-outline"
                    color={colors.heroMuted}
                    size={20}
                  />
                </Row>
              </Press>
              <Row>
                <Button
                  title={t("shareInvitation")}
                  icon="share-social-outline"
                  kind="secondary"
                  style={{ flex: 1 }}
                  onPress={() =>
                    void Share.share({
                      message:
                        group.name +
                        "\n" +
                        invitationLink(group.code) +
                        "\n" +
                        group.code,
                    }).catch(() => notify("error"))
                  }
                />
                <Button
                  title={t("copyLinkShort")}
                  kind="secondary"
                  icon="link-outline"
                  style={{ flex: 1 }}
                  onPress={() => copy(invitationLink(group.code))}
                />
              </Row>
            </Card>
          )}
          <Button
            title={t("fillMyCalendar")}
            icon="calendar-outline"
            onPress={() => router.navigate("/(tabs)/calendar")}
          />
          <Row>
            <Button
              title={t("addAnotherGroup")}
              icon="add"
              kind="secondary"
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() => setOverlay({ kind: "createGroup" })}
            />
            <Button
              title={t("joinGroup")}
              icon="enter-outline"
              kind="secondary"
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() => setOverlay({ kind: "joinGroup" })}
            />
          </Row>
          {p.items.map((item) => (
            <Press
              key={item.id}
              label={
                item.name +
                (item.id === group?.id ? ", " + t("activeGroup") : "")
              }
              selected={item.id === group?.id}
              disabled={busy}
              onPress={() =>
                void switchGroup(item.id)
                  .then(() => router.navigate("/(tabs)"))
                  .catch(() => {})
              }
              style={{ borderRadius: 26 }}
            >
              <Card
                style={{
                  borderColor:
                    item.id === group?.id ? colors.accent : colors.glassLine,
                  gap: 18,
                }}
              >
                <Row between>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Txt heading size={23} weight="semibold">
                      {item.name}
                    </Txt>
                    <Txt muted size={12}>
                      {item.memberCount} {t("members")}
                    </Txt>
                  </View>
                  <Icon name="arrow-forward" color={colors.accent} />
                </Row>
                {item.id === group?.id && (
                  <Row style={{ gap: 6 }}>
                    {group.members.slice(0, 5).map((member) => (
                      <Avatar key={member.id} person={member} size={34} />
                    ))}
                    <Txt muted size={12}>
                      {t(demoMode ? "demoBadge" : "activeGroup")}
                    </Txt>
                  </Row>
                )}
              </Card>
            </Press>
          ))}
          <Pager page={p.page} pages={p.pages} onPage={setPage} />
          {moreGroups && (
            <Button
              title={t("loadMore")}
              kind="secondary"
              onPress={() => void loadMoreGroups().catch(() => {})}
              disabled={busy}
            />
          )}
        </>
      )}
      <Txt size={11} muted style={{ textAlign: "center" }}>
        {t("privacy")}
      </Txt>
    </Screen>
  );
}

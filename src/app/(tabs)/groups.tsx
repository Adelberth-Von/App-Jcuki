import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { Share, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../store";
import { paginate } from "../../lib/domain";
import { invitationLink } from "../../lib/invitations";
import {
  Button,
  Card,
  Divider,
  Icon,
  Pager,
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
  const [page, setPage] = useState(1);
  const active = demoMode ? null : group;
  const others = groups.filter((item) => item.id !== active?.id);
  const list = paginate(others, page, 4);
  const copy = (text: string) =>
    void Clipboard.setStringAsync(text)
      .then((copied) => notify(copied ? "copied" : "error"))
      .catch(() => notify("error"));

  return (
    <Screen title={t("groups")}>
      {!groups.length ? (
        <GroupStart />
      ) : (
        <>
          {active && (
            <Card style={{ gap: 16 }}>
              <View style={{ gap: 4 }}>
                <Txt size={13} muted>
                  {t("activeGroup")}
                </Txt>
                <Txt heading size={24} weight="semibold">
                  {active.name}
                </Txt>
                <Txt muted>
                  {active.members.length} {t("members")}
                </Txt>
              </View>
              <Divider />
              <Press
                label={t("copy") + " " + t("inviteCode") + ", " + active.code}
                onPress={() => copy(active.code)}
              >
                <Row between>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt size={13} muted>
                      {t("inviteCode")}
                    </Txt>
                    <Txt weight="semibold" size={18}>
                      {active.code}
                    </Txt>
                  </View>
                  <Icon name="copy-outline" color={colors.accent} />
                </Row>
              </Press>
              <Row style={{ gap: 8, flexWrap: "wrap" }}>
                <Button
                  title={t("shareInvitation")}
                  icon="share-outline"
                  style={{ flexGrow: 1, flexBasis: 154 }}
                  onPress={() =>
                    void Share.share({
                      message: `${active.name}\n${invitationLink(active.code)}\n${active.code}`,
                    }).catch(() => notify("error"))
                  }
                />
                <Button
                  title={t("copyLinkShort")}
                  kind="secondary"
                  icon="link-outline"
                  style={{ flexGrow: 1, flexBasis: 116 }}
                  onPress={() => copy(invitationLink(active.code))}
                />
              </Row>
            </Card>
          )}
          <Row style={{ gap: 8, flexWrap: "wrap" }}>
            <Button
              title={t("createGroup")}
              icon="add"
              kind="secondary"
              style={{ flexGrow: 1, flexBasis: 132 }}
              disabled={busy}
              onPress={() => setOverlay({ kind: "createGroup" })}
            />
            <Button
              title={t("joinGroup")}
              icon="enter-outline"
              kind="secondary"
              style={{ flexGrow: 1, flexBasis: 132 }}
              disabled={busy}
              onPress={() => setOverlay({ kind: "joinGroup" })}
            />
          </Row>
          {(list.items.length > 0 || moreGroups) && (
            <Card>
              {list.items.map((item, index) => {
                const selected = item.id === group?.id;
                return (
                  <View key={item.id}>
                    {index > 0 && <Divider />}
                    <Press
                      selected={selected}
                      disabled={busy}
                      onPress={() =>
                        void switchGroup(item.id)
                          .then(() => router.navigate("/(tabs)"))
                          .catch(() => {})
                      }
                    >
                      <Row between style={{ paddingVertical: 12 }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Txt size={16} weight="semibold">
                            {item.name}
                          </Txt>
                          <Txt muted size={13}>
                            {item.memberCount} {t("members")}
                            {selected && " · " + t("demoBadge")}
                          </Txt>
                        </View>
                        <Icon name="chevron-forward" color={colors.muted} />
                      </Row>
                    </Press>
                  </View>
                );
              })}
              <Pager page={list.page} pages={list.pages} onPage={setPage} />
              {moreGroups && (
                <Button
                  title={t("loadMore")}
                  kind="text"
                  onPress={() => void loadMoreGroups().catch(() => {})}
                  disabled={busy}
                />
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

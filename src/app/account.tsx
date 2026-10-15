import React, { useState } from "react";
import { View } from "react-native";
import { useAuth } from "../auth/provider";
import { useApp } from "../store";
import {
  Avatar,
  Button,
  Card,
  Field,
  Icon,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from "../components/ui";
export default function Account() {
  const { session } = useAuth();
  const {
    t,
    profile,
    colors,
    busy,
    saveProfile,
    choosePhoto,
    logoutAccount,
    setOverlay,
    notify,
    syncStatus,
    refreshing,
    refresh,
    lastSyncedAt,
    time,
  } = useApp();
  const [edits, setEdits] = useState<{ fullName?: string; nickname?: string }>(
    {},
  );
  const fullName = edits.fullName ?? profile.fullName ?? "",
    nickname = edits.nickname ?? profile.nickname;
  return (
    <Screen
      title={t("authAccount")}
      description={t("authAccountDescription")}
      back
    >
      <Card>
        <Row>
          <Avatar person={profile} size={68} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={22} weight="semibold">
              {profile.nickname}
            </Txt>
            <Txt muted>{session?.user.email}</Txt>
            <Txt muted size={11}>
              {t("authUseThisEmail")}
            </Txt>
          </View>
        </Row>
        <Button
          title={t("changePhoto")}
          kind="soft"
          icon="image-outline"
          style={{ marginTop: 18 }}
          disabled={busy}
          onPress={() => void choosePhoto()}
        />
      </Card>
      <Card>
        <SectionTitle title={t("authDetails")} />
        <View style={{ gap: 18 }}>
          <Field
            label={t("authFullName")}
            value={fullName}
            onChangeText={(fullName) =>
              setEdits((old) => ({ ...old, fullName }))
            }
            autoComplete="name"
            maxLength={80}
          />
          <Field
            label={t("nickname")}
            value={nickname}
            onChangeText={(nickname) =>
              setEdits((old) => ({ ...old, nickname }))
            }
            autoComplete="nickname"
            maxLength={24}
          />
          <Row>
            <Icon
              name={
                syncStatus === "ready"
                  ? "cloud-done-outline"
                  : "cloud-offline-outline"
              }
              color={syncStatus === "ready" ? colors.accent : colors.peachText}
            />
            <Txt muted size={12} style={{ flex: 1 }}>
              {t(
                syncStatus === "ready"
                  ? "syncReady"
                  : syncStatus === "loading"
                    ? "syncLoading"
                    : "syncFailedHint",
              )}
            </Txt>
          </Row>
          {lastSyncedAt !== null && (
            <Txt muted size={11}>
              {t("lastSync")}: {time(lastSyncedAt)}
            </Txt>
          )}
          {syncStatus === "error" && (
            <Button
              title={t("retry")}
              disabled={refreshing}
              kind="secondary"
              onPress={() => void refresh()}
            />
          )}
          <Button
            title={t("save")}
            disabled={
              busy || fullName.trim().length < 2 || nickname.trim().length < 2
            }
            onPress={() =>
              void saveProfile(nickname.trim(), fullName.trim())
                .then(() => {
                  setEdits({});
                  notify("profileUpdated");
                })
                .catch(() => {})
            }
          />
        </View>
      </Card>
      <Button
        title={t("authLogout")}
        kind="danger"
        icon="log-out-outline"
        disabled={busy}
        onPress={() =>
          setOverlay({
            kind: "confirm",
            title: t("authLogout"),
            description: t("authLogoutDescription"),
            onConfirm: async () => {
              setOverlay(null);
              await logoutAccount();
            },
          })
        }
      />
    </Screen>
  );
}

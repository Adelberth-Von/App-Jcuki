import React, { useState } from "react";
import { Keyboard, View } from "react-native";
import { useAuth } from "../auth/provider";
import { useApp } from "../store";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Field,
  Row,
  Screen,
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
    deletePhoto,
    logoutAccount,
    setOverlay,
    notify,
    photoPending,
    retryPhotoUpload,
  } = useApp();
  const [edits, setEdits] = useState<{ fullName?: string; nickname?: string }>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [touched, setTouched] = useState({ fullName: false, nickname: false });
  const fullName = edits.fullName ?? profile.fullName ?? "";
  const nickname = edits.nickname ?? profile.nickname;
  const dirty =
    fullName.trim() !== (profile.fullName || "") ||
    nickname.trim() !== profile.nickname;
  const invalidName = fullName.trim().length < 2;
  const invalidNickname = nickname.trim().length < 2;
  const nameError = (submitted || touched.fullName) && invalidName;
  const nicknameError = (submitted || touched.nickname) && invalidNickname;

  async function save() {
    if (busy) return;
    setSubmitted(true);
    setSaveFailed(false);
    if (invalidName || invalidNickname) return;
    Keyboard.dismiss();
    try {
      await saveProfile(nickname.trim(), fullName.trim());
      setEdits({});
      setSubmitted(false);
      notify("profileUpdated");
    } catch {
      setSaveFailed(true);
    }
  }

  return (
    <Screen title={t("authAccount")} back>
      <Card style={{ gap: 16 }}>
        <Row>
          <Avatar person={profile} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={18} weight="semibold">
              {profile.nickname}
            </Txt>
            <Txt muted>{session?.user.email}</Txt>
          </View>
        </Row>
        <Row style={{ gap: 8, flexWrap: "wrap" }}>
          <Button
            title={t("changePhoto")}
            kind="secondary"
            icon="image-outline"
            style={{ flexGrow: 1 }}
            disabled={busy}
            onPress={() => void choosePhoto()}
          />
          {profile.avatarUri && (
            <Button
              title={t("removePhoto")}
              kind="text"
              style={{ flexGrow: 1 }}
              disabled={busy}
              onPress={() => void deletePhoto().catch(() => {})}
            />
          )}
        </Row>
        {photoPending && (
          <View style={{ gap: 8 }}>
            <Txt size={13} color={colors.peachText}>
              {t("photoPendingHint")}
            </Txt>
            <Button
              title={t("uploadPhotoAgain")}
              kind="secondary"
              icon="cloud-upload-outline"
              disabled={busy}
              onPress={() => void retryPhotoUpload().catch(() => {})}
            />
          </View>
        )}
        <Divider />
        <View style={{ gap: 4 }}>
          <Field
            label={t("authFullName")}
            accessibilityHint={nameError ? t("authFullNameInvalid") : undefined}
            style={nameError ? { borderColor: colors.danger } : undefined}
            value={fullName}
            onBlur={() => setTouched((old) => ({ ...old, fullName: true }))}
            onChangeText={(fullName) => {
              setEdits((old) => ({ ...old, fullName }));
              setSaveFailed(false);
            }}
            editable={!busy}
            autoComplete="name"
            maxLength={80}
          />
          {nameError && (
            <View accessibilityRole="alert">
              <Txt color={colors.danger} size={13}>
                {t("authFullNameInvalid")}
              </Txt>
            </View>
          )}
        </View>
        <View style={{ gap: 4 }}>
          <Field
            label={t("nickname")}
            accessibilityHint={nicknameError ? t("invalidNickname") : undefined}
            style={nicknameError ? { borderColor: colors.danger } : undefined}
            value={nickname}
            onBlur={() => setTouched((old) => ({ ...old, nickname: true }))}
            onChangeText={(nickname) => {
              setEdits((old) => ({ ...old, nickname }));
              setSaveFailed(false);
            }}
            editable={!busy}
            autoComplete="nickname"
            maxLength={24}
          />
          {nicknameError && (
            <View accessibilityRole="alert">
              <Txt color={colors.danger} size={13}>
                {t("invalidNickname")}
              </Txt>
            </View>
          )}
        </View>
        {saveFailed && (
          <View accessibilityRole="alert">
            <Txt color={colors.danger} size={13}>
              {t("profileUpdateFailed")}
            </Txt>
          </View>
        )}
        <Button
          title={t(busy && dirty ? "syncing" : "save")}
          disabled={busy || !dirty}
          onPress={() => void save()}
        />
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
              await logoutAccount();
              setOverlay(null);
            },
          })
        }
      />
    </Screen>
  );
}

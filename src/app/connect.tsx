import React, { useState } from "react";
import { Keyboard, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { Button, Card, Field, Screen, Txt } from "../components/ui";
import { invitationCode } from "../lib/invitations";

export default function Connect() {
  const { mode, code: rawCode } = useLocalSearchParams<{
    mode?: string;
    code?: string;
  }>();
  const join = mode === "join";
  const action = join ? "joinGroup" : "createGroup";
  const { t, colors, busy, demoMode, createGroup, joinGroup } = useApp();
  const [name, setName] = useState("");
  const [code, setCode] = useState(typeof rawCode === "string" ? rawCode : "");
  const [error, setError] = useState("");

  async function paste() {
    try {
      const pasted = invitationCode(await Clipboard.getStringAsync());
      if (pasted) setCode(pasted);
      setError(pasted ? "" : "inviteInvalidHint");
    } catch {
      setError("error");
    }
  }

  async function submit() {
    if (busy) return;
    const normalized = invitationCode(code);
    const groupName = name.trim();
    if (join ? !normalized : groupName.length < 2) {
      setError(join ? "inviteInvalidHint" : "invalidGroupName");
      return;
    }
    Keyboard.dismiss();
    setError("");
    try {
      if (join) await joinGroup(normalized);
      else await createGroup(groupName);
      router.dismissTo("/(tabs)/groups");
    } catch (e) {
      const key = e instanceof Error ? e.message : "";
      if (key === "BUSY") return;
      setError(
        key === "INVALID_CODE" || key === "GROUP_NOT_FOUND"
          ? "inviteNotFound"
          : key === "GROUP_FULL"
            ? "groupFull"
            : key === "RATE_LIMITED"
              ? "rateLimited"
              : key === "INVALID_GROUP_NAME"
                ? "invalidGroupName"
                : "connectionActionFailed",
      );
    }
  }

  return (
    <Screen title={t(action)} back>
      {demoMode ? (
        <Card style={{ gap: 16 }}>
          <Txt>{t("demoNoAccountHint")}</Txt>
          <Button
            title={t("authRegister")}
            onPress={() => router.push("/register")}
          />
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          <Card style={{ gap: 16 }}>
            {join ? (
              <Field
                testID="invite-code"
                editable={!busy}
                label={t("inviteCodeOrLink")}
                value={code}
                onChangeText={(value) => {
                  setCode(value);
                  setError("");
                }}
                maxLength={200}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />
            ) : (
              <Field
                testID="group-name"
                editable={!busy}
                label={t("groupName")}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setError("");
                }}
                placeholder={t("groupPlaceholder")}
                maxLength={40}
                autoCapitalize="words"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />
            )}
            {!!error && (
              <View accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Txt color={colors.danger}>{t(error)}</Txt>
              </View>
            )}
            {join && (
              <Button
                title={t("pasteInvite")}
                disabled={busy}
                kind="secondary"
                icon="clipboard-outline"
                onPress={() => void paste()}
              />
            )}
            <Button
              testID="connect-submit"
              title={t(busy ? "syncing" : action)}
              disabled={busy}
              onPress={() => void submit()}
            />
          </Card>
          <Button
            title={t(join ? "createGroup" : "joinGroup")}
            kind="text"
            disabled={busy}
            onPress={() => {
              setError("");
              router.setParams({ mode: join ? "create" : "join" });
            }}
          />
        </View>
      )}
    </Screen>
  );
}

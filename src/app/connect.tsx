import React, { useState } from "react";
import { Keyboard, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import {
  Button,
  Card,
  Field,
  Icon,
  Press,
  Row,
  Screen,
  Txt,
} from "../components/ui";
import { invitationCode } from "../lib/invitations";

export default function Connect() {
  const { mode: rawMode, code: rawCode } = useLocalSearchParams<{
    mode?: string;
    code?: string;
  }>();
  const join = rawMode === "join";
  const { t, colors, busy, demoMode, createGroup, joinGroup, notify } =
    useApp();
  const [name, setName] = useState(""),
    [code, setCode] = useState(rawCode || ""),
    [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    const normalized = invitationCode(code);
    if (join ? !normalized : name.trim().length < 2) {
      setError(t(join ? "inviteInvalidHint" : "invalidGroupName"));
      return;
    }
    Keyboard.dismiss();
    setError("");
    try {
      if (join) await joinGroup(normalized);
      else await createGroup(name);
      router.replace("/(tabs)/groups");
    } catch (e) {
      const key = e instanceof Error ? e.message : "";
      setError(
        t(
          key === "INVALID_CODE"
            ? "inviteNotFound"
            : key === "GROUP_FULL"
              ? "groupFull"
              : "connectionActionFailed",
        ),
      );
    }
  }
  return (
    <Screen title={t("connectTitle")} description={t("connectHint")} back>
      <Row style={{ gap: 6 }}>
        <Icon name="lock-closed-outline" color={colors.accent} size={15} />
        <Txt size={12} color={colors.accent}>
          {t("privateGroup")}
        </Txt>
      </Row>
      {demoMode ? (
        <Card style={{ gap: 18 }}>
          <Txt heading size={23} weight="semibold">
            {t("demoNoAccount")}
          </Txt>
          <Txt muted>{t("demoNoAccountHint")}</Txt>
          <Button
            title={t("authRegister")}
            onPress={() => router.push("/register")}
          />
        </Card>
      ) : (
        <>
          <Row
            style={{
              padding: 5,
              gap: 5,
              backgroundColor: colors.surfaceAlt,
              borderRadius: 20,
            }}
          >
            {[false, true].map((value) => (
              <Press
                key={String(value)}
                role="tab"
                selected={join === value}
                label={t(value ? "joinGroup" : "createGroup")}
                disabled={busy}
                onPress={() => {
                  setError("");
                  router.setParams({ mode: value ? "join" : "create" });
                }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor:
                    join === value ? colors.surface : "transparent",
                }}
              >
                <View style={{ paddingVertical: 15, alignItems: "center" }}>
                  <Txt
                    weight="semibold"
                    size={13}
                    color={join === value ? colors.accent : colors.muted}
                  >
                    {t(value ? "joinGroup" : "createGroup")}
                  </Txt>
                </View>
              </Press>
            ))}
          </Row>
          <Card style={{ padding: 24, gap: 22 }}>
            <View style={{ gap: 8 }}>
              <Txt size={24} heading weight="semibold">
                {t(join ? "joinTitle" : "createTitle")}
              </Txt>
              <Txt muted size={14}>
                {t(join ? "joinHint" : "createHint")}
              </Txt>
            </View>
            {join ? (
              <>
                <Field
                  testID="invite-code"
                  editable={!busy}
                  label={t("inviteCodeOrLink")}
                  placeholder="ABCD 2345 EFGH / jcuki://join?..."
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
                <Button
                  title={t("pasteInvite")}
                  disabled={busy}
                  kind="soft"
                  icon="clipboard-outline"
                  onPress={() =>
                    void Clipboard.getStringAsync()
                      .then((value) => {
                        setCode(value);
                        setError("");
                      })
                      .catch(() => notify("error"))
                  }
                />
                <Txt muted size={12}>
                  {t("inviteInputHint")}
                </Txt>
              </>
            ) : (
              <>
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
                <Row style={{ gap: 10 }}>
                  <Icon name="link-outline" color={colors.accent} size={19} />
                  <Txt muted size={12} style={{ flex: 1 }}>
                    {t("createInviteHint")}
                  </Txt>
                </Row>
              </>
            )}
            {!!error && (
              <View accessibilityRole="alert">
                <Txt color={colors.danger} size={13}>
                  {error}
                </Txt>
              </View>
            )}
            <Button
              testID="connect-submit"
              title={t(busy ? "syncing" : join ? "joinGroup" : "createGroup")}
              icon={busy ? "time-outline" : "arrow-forward"}
              disabled={busy || (join ? !code.trim() : name.trim().length < 2)}
              onPress={() => void submit()}
            />
          </Card>
          <Txt size={12} muted style={{ textAlign: "center" }}>
            {t("connectFootnote")}
          </Txt>
        </>
      )}
    </Screen>
  );
}

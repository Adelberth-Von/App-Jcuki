import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { goBack } from "../navigation";
import { zoneAbbreviation } from "../lib/domain";
import {
  Avatar,
  Brand,
  Button,
  Card,
  Field,
  Icon,
  IconButton,
  Press,
  Row,
  Txt,
} from "../components/ui";
export default function Welcome() {
  const {
    t,
    prefs,
    profile,
    colors,
    busy,
    saveProfile,
    enterDemo,
    choosePhoto,
    updatePrefs,
    setOverlay,
    zone,
    apiUrl,
    demoMode,
  } = useApp();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit === "1",
    inset = useSafeAreaInsets();
  const [nickname, setNickname] = useState(profile.nickname);
  const [step, setStep] = useState<"profile" | "circle">("profile");
  const [error, setError] = useState("");
  async function next() {
    setError("");
    try {
      await saveProfile(nickname);
      if (editing) {
        goBack();
        return;
      }
      setStep("circle");
    } catch {
      setError(t("profileSaveError"));
    }
  }
  async function demo() {
    try {
      await enterDemo(nickname.trim() || undefined);
      router.replace("/(tabs)");
    } catch {
      setError(t("error"));
    }
  }
  function openGroup(join: boolean) {
    router.replace("/(tabs)/groups");
    setOverlay({ kind: join ? "joinGroup" : "createGroup" });
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 200,
            maxWidth: 540,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Row between style={{ minHeight: 68 }}>
            {editing || step === "circle" ? (
              <IconButton
                icon="arrow-back"
                label={t("back")}
                onPress={() => (editing ? goBack() : setStep("profile"))}
              />
            ) : (
              <Brand />
            )}
            <Button
              title={prefs.language === "id" ? "EN" : "ID"}
              kind="text"
              onPress={() =>
                void updatePrefs({
                  language: prefs.language === "id" ? "en" : "id",
                }).catch(() => {})
              }
            />
          </Row>
          {!editing && (
            <Row between style={{ marginTop: 18, marginBottom: 18 }}>
              <Txt size={12} weight="semibold" color={colors.accent}>
                {t(
                  step === "profile" ? "onboardingProfile" : "onboardingCircle",
                )}
              </Txt>
              <Row style={{ gap: 6 }}>
                <View
                  style={{
                    width: 26,
                    height: 4,
                    borderRadius: 3,
                    backgroundColor: colors.accent,
                  }}
                />
                <View
                  style={{
                    width: 26,
                    height: 4,
                    borderRadius: 3,
                    backgroundColor:
                      step === "circle" ? colors.accent : colors.line,
                  }}
                />
              </Row>
            </Row>
          )}
          <Txt
            size={34}
            weight="semibold"
            heading
            style={{
              letterSpacing: -1.2,
              lineHeight: 42,
              marginTop: editing ? 20 : 0,
            }}
          >
            {editing
              ? t("editProfile")
              : step === "profile"
                ? t("greetingTitle")
                : t("circleTitle")}
          </Txt>
          <Txt size={14} muted style={{ marginTop: 12, lineHeight: 23 }}>
            {editing
              ? t("nicknameHelp")
              : t(
                  step === "profile"
                    ? "greetingDescription"
                    : "circleDescription",
                )}
          </Txt>
          {step === "profile" || editing ? (
            <>
              <Card style={{ marginTop: 26 }}>
                <Row style={{ gap: 16, marginBottom: 20 }}>
                  <Press
                    label={t("choosePhoto")}
                    onPress={() => void choosePhoto()}
                    disabled={busy}
                  >
                    <View>
                      <Avatar
                        person={{ ...profile, nickname: nickname || t("you") }}
                        size={80}
                      />
                      <View
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: -2,
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          backgroundColor: colors.accent,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 2,
                          borderColor: colors.surface,
                        }}
                      >
                        <Icon
                          name="camera-outline"
                          color={colors.onAccent}
                          size={15}
                        />
                      </View>
                    </View>
                  </Press>
                  <View style={{ flex: 1 }}>
                    <Txt size={15} weight="semibold">
                      {t("profilePhoto")}
                    </Txt>
                    <Txt muted size={12} style={{ marginTop: 4 }}>
                      {t("photoOptional")}
                    </Txt>
                    <Button
                      title={t(
                        profile.avatarUri ? "changePhoto" : "choosePhoto",
                      )}
                      kind="text"
                      onPress={() => void choosePhoto()}
                      disabled={busy}
                      style={{ alignSelf: "flex-start", marginLeft: -18 }}
                    />
                  </View>
                </Row>
                <Field
                  label={t("nickname")}
                  value={nickname}
                  onChangeText={(value) => {
                    setNickname(value);
                    setError("");
                  }}
                  placeholder={t("nicknamePlaceholder")}
                  maxLength={24}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (nickname.trim().length >= 2 && !busy) void next();
                  }}
                />
                <Txt muted size={12} style={{ marginTop: 8 }}>
                  {t("nicknameHelp")}
                </Txt>
              </Card>
              <Row style={{ marginTop: 18, alignItems: "flex-start", gap: 10 }}>
                <Icon name="globe-outline" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Txt size={13} weight="medium">
                    {zone.split("/").at(-1)?.replace(/_/g, " ")} ·{" "}
                    {zoneAbbreviation(zone)}
                  </Txt>
                  <Txt muted size={12} style={{ marginTop: 3 }}>
                    {t("zoneAutomaticHint")}
                  </Txt>
                </View>
              </Row>
            </>
          ) : (
            <View style={{ gap: 14, marginTop: 26 }}>
              {[false, true].map((join) => (
                <Press
                  key={String(join)}
                  label={t(join ? "joinGroup" : "createGroup")}
                  onPress={() => openGroup(join)}
                  disabled={!apiUrl || demoMode || busy}
                >
                  <Card>
                    <Row>
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 18,
                          backgroundColor: colors.accentSoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon
                          name={join ? "ticket-outline" : "people-outline"}
                          color={colors.accent}
                          size={25}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt size={17} weight="semibold">
                          {t(join ? "joinGroup" : "createGroup")}
                        </Txt>
                        <Txt muted size={12} style={{ marginTop: 4 }}>
                          {t(join ? "joinCircleHint" : "createCircleHint")}
                        </Txt>
                      </View>
                      <Icon name="arrow-forward" color={colors.accent} />
                    </Row>
                  </Card>
                </Press>
              ))}
              {(!apiUrl || demoMode) && (
                <Card
                  style={{
                    backgroundColor: colors.peach,
                    borderColor: colors.peach,
                  }}
                >
                  <Txt size={14} weight="semibold" color={colors.peachText}>
                    {t("circleConnectionTitle")}
                  </Txt>
                  <Txt
                    size={13}
                    color={colors.peachText}
                    style={{ marginTop: 6 }}
                  >
                    {t("circleConnectionHint")}
                  </Txt>
                  <Button
                    title={t("connection")}
                    kind="text"
                    onPress={() => setOverlay({ kind: "connection" })}
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 6,
                      marginLeft: -18,
                    }}
                  />
                </Card>
              )}
            </View>
          )}
          {!!error && (
            <Txt color={colors.danger} size={13} style={{ marginTop: 16 }}>
              {error}
            </Txt>
          )}
        </ScrollView>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: Math.max(16, inset.bottom),
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            gap: 8,
            maxWidth: 540,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {step === "profile" || editing ? (
            <Button
              title={busy ? t("syncing") : t(editing ? "save" : "continue")}
              icon={editing ? "checkmark" : "arrow-forward"}
              disabled={busy || nickname.trim().length < 2}
              onPress={() => void next()}
            />
          ) : (
            <Button
              title={t("demo")}
              icon="sparkles-outline"
              disabled={busy}
              onPress={() => void demo()}
            />
          )}
          {!editing && step === "profile" && (
            <Button
              title={t("demo")}
              kind="text"
              disabled={busy}
              onPress={() => void demo()}
            />
          )}
          <Txt size={12} muted style={{ textAlign: "center" }}>
            {editing ? t("signature") : t("demoNote")}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

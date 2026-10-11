import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { goBack } from "../navigation";
import {
  Avatar,
  Brand,
  Button,
  Field,
  Icon,
  IconButton,
  Press,
  Row,
  Txt,
} from "../components/ui";
function TogetherIllustration() {
  const { colors, dark } = useApp();
  return (
    <View
      accessible={false}
      style={{
        height: 220,
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 8,
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 216,
          height: 216,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 108,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 150,
          height: 150,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 75,
        }}
      />
      <View
        style={{
          width: 91,
          height: 91,
          backgroundColor: "#185F50",
          borderRadius: 30,
          justifyContent: "center",
          alignItems: "center",
          transform: [{ rotate: "-9deg" }],
          boxShadow: "0 12px 36px rgba(20,60,40,0.14)",
        }}
      >
        <Icon name="link" color="#FFFFFF" size={57} />
      </View>
      <View
        style={{
          position: "absolute",
          left: "10%",
          top: 24,
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 20,
          padding: 15,
          transform: [{ rotate: "-6deg" }],
        }}
      >
        <Row style={{ gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.green,
            }}
          />
          <Txt size={10} muted>
            BERLIN
          </Txt>
        </Row>
        <Txt size={26} weight="bold" style={{ letterSpacing: -1 }}>
          15:00
        </Txt>
        <Txt size={10} muted>
          CET / CEST
        </Txt>
      </View>
      <View
        style={{
          position: "absolute",
          right: "6%",
          bottom: 13,
          backgroundColor: dark ? colors.surface : "#FAEFE5",
          borderRadius: 20,
          padding: 15,
          transform: [{ rotate: "5deg" }],
        }}
      >
        <Row style={{ gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.peachText,
            }}
          />
          <Txt size={10} muted>
            JAKARTA
          </Txt>
        </Row>
        <Txt size={26} weight="bold" style={{ letterSpacing: -1 }}>
          20:00
        </Txt>
        <Txt size={10} muted>
          WIB
        </Txt>
      </View>
      <View
        style={{
          position: "absolute",
          right: 24,
          top: 27,
          width: 33,
          height: 33,
          borderRadius: 12,
          backgroundColor: colors.greenSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="sparkles-outline" color={colors.green} size={18} />
      </View>
    </View>
  );
}
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
    } = useApp(),
    { edit } = useLocalSearchParams<{ edit?: string }>(),
    insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState(profile.nickname);
  const editing = edit === "1";
  async function start() {
    try {
      await saveProfile(nickname);
      if (editing) {
        goBack();
        return;
      }
      router.replace("/(tabs)/groups");
      setOverlay({ kind: "createGroup" });
    } catch {}
  }
  async function demo() {
    try {
      if (nickname.trim()) await saveProfile(nickname);
      await enterDemo();
      router.replace("/(tabs)");
    } catch {}
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 190,
            paddingTop: 9,
            maxWidth: 520,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Row between style={{ minHeight: 58 }}>
            {editing ? (
              <IconButton
                icon="arrow-back"
                label={t("back")}
                onPress={goBack}
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
          {!editing && <TogetherIllustration />}
          <View style={{ marginTop: editing ? 35 : 14 }}>
            <Txt
              size={editing ? 32 : 40}
              weight="bold"
              heading
              style={{ letterSpacing: -1.8, lineHeight: editing ? 43 : 47 }}
            >
              {editing ? t("editProfile") : t("heroTitle")}
            </Txt>
            <Txt
              size={14}
              muted
              style={{ marginTop: 15, lineHeight: 23, maxWidth: 360 }}
            >
              {editing ? t("nicknameHelp") : t("heroDescription")}
            </Txt>
          </View>
          <Row style={{ marginVertical: 25, gap: 15 }}>
            <Press label={t("choosePhoto")} onPress={() => void choosePhoto()}>
              <View>
                <Avatar person={profile} size={62} />
                <View
                  style={{
                    position: "absolute",
                    bottom: -3,
                    right: -3,
                    width: 26,
                    height: 26,
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: colors.bg,
                  }}
                >
                  <Icon
                    name="camera-outline"
                    color={colors.surface}
                    size={14}
                  />
                </View>
              </View>
            </Press>
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="semibold">
                {t("choosePhoto")}
              </Txt>
              <Txt size={11} muted style={{ marginTop: 3 }}>
                {t("photoDescription")}
              </Txt>
            </View>
          </Row>
          <Field
            label={t("nickname")}
            value={nickname}
            onChangeText={setNickname}
            placeholder={t("nicknamePlaceholder")}
            maxLength={24}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => void start()}
          />
          <Txt size={11} muted style={{ marginTop: 9 }}>
            {t("nicknameHelp")}
          </Txt>
        </ScrollView>
        <View
          style={{
            position: "absolute",
            bottom: Math.max(12, insets.bottom),
            left: 20,
            right: 20,
            gap: 8,
            backgroundColor: colors.bg,
            paddingTop: 12,
            maxWidth: 480,
            alignSelf: "center",
            width: undefined,
          }}
        >
          <Button
            title={editing ? t("save") : t("start")}
            icon={editing ? "checkmark" : "arrow-forward"}
            onPress={() => void start()}
            disabled={busy || nickname.trim().length < 2}
          />
          {!editing && (
            <Button
              title={t("demo")}
              onPress={() => void demo()}
              kind="secondary"
              disabled={busy}
            />
          )}
          <Txt
            size={10}
            muted
            style={{ textAlign: "center", paddingVertical: 8 }}
          >
            {t("signature")} · {t("nativeBuild")}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

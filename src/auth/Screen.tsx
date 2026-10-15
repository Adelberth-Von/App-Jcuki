import React, { useRef, useState } from "react";
import { Keyboard, Modal, TextInput, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { font } from "../theme";
import { AmbientBackground, GlassSurface } from "../components/glass";
import { Brand, Button, Icon, IconButton, Row, Txt } from "../components/ui";
import { loginAccount, registerAccount } from "./actions";
import { useAuth } from "./provider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { FormScroll } from "../components/keyboard";
import {
  accountError,
  validateAccount,
  type AccountFields,
} from "./validation";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const { t, colors, prefs, updatePrefs, enterDemo } = useApp(),
    insets = useSafeAreaInsets();
  const { invite, email: initialEmail } = useLocalSearchParams<{
    invite?: string;
    email?: string;
  }>();
  const { setPendingInvite } = useAuth();
  const reduced = useReducedMotion();
  const [fields, setFields] = useState<AccountFields>({
    fullName: "",
    nickname: "",
    email: initialEmail || "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<
      Partial<Record<keyof AccountFields, string>>
    >({}),
    [pending, setPending] = useState(false),
    [show, setShow] = useState<Record<string, boolean>>({}),
    [feedback, setFeedback] = useState("");
  const refs = useRef<Partial<Record<keyof AccountFields, TextInput | null>>>(
    {},
  );
  const rows: {
    key: keyof AccountFields;
    label: string;
    icon: React.ComponentProps<typeof Icon>["name"];
    password?: boolean;
  }[] = [
    ...(register
      ? [
          {
            key: "fullName" as const,
            label: "authFullName",
            icon: "person-outline" as const,
          },
          {
            key: "nickname" as const,
            label: "nickname",
            icon: "at-outline" as const,
          },
        ]
      : []),
    { key: "email", label: "authEmail", icon: "mail-outline" },
    {
      key: "password",
      label: "authPassword",
      icon: "lock-closed-outline",
      password: true,
    },
    ...(register
      ? [
          {
            key: "confirmPassword" as const,
            label: "authConfirmPassword",
            icon: "shield-checkmark-outline" as const,
            password: true,
          },
        ]
      : []),
  ];
  async function submit() {
    if (pending) return;
    const invalid = validateAccount(fields, register);
    setErrors(invalid);
    const first = rows.find((row) => invalid[row.key]);
    if (first) {
      refs.current[first.key]?.focus();
      setFeedback("authCheckFields");
      return;
    }
    setPending(true);
    Keyboard.dismiss();
    if (invite) setPendingInvite(invite);
    try {
      if (register) await registerAccount(fields);
      else await loginAccount(fields.email, fields.password);
      // The root resumes invitations once the new account workspace is ready.
    } catch (error) {
      setFeedback(accountError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientBackground />
      <FormScroll
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 20) + 20,
          width: "100%",
          maxWidth: 510,
          alignSelf: "center",
          flexGrow: 1,
        }}
      >
        <Row between style={{ minHeight: 58 }}>
          <Brand />
          <Button
            title={prefs.language === "id" ? "EN" : "ID"}
            kind="text"
            onPress={() =>
              void updatePrefs({
                language: prefs.language === "id" ? "en" : "id",
              })
            }
          />
        </Row>
        <View style={{ marginTop: 26, marginBottom: 26, gap: 12 }}>
          <Row>
            <View
              style={{
                height: 34,
                width: 34,
                borderRadius: 17,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={register ? "sparkles-outline" : "leaf-outline"}
                size={17}
                color={colors.accent}
              />
            </View>
            <Txt color={colors.accent} weight="semibold" size={12}>
              {t("authEyebrow")}
            </Txt>
          </Row>
          <Txt
            heading
            size={register ? 34 : 38}
            weight="semibold"
            style={{ letterSpacing: -1.5, lineHeight: register ? 40 : 45 }}
          >
            {t(register ? "authRegisterTitle" : "authLoginTitle")}
          </Txt>
          <Txt muted size={14} style={{ maxWidth: 330 }}>
            {t(register ? "authRegisterDescription" : "authLoginDescription")}
          </Txt>
        </View>
        <GlassSurface style={{ padding: 22, gap: 18 }}>
          {rows.map((row, index) => (
            <View key={row.key} style={{ gap: 7 }}>
              <Txt size={12} weight="semibold">
                {t(row.label)}
              </Txt>
              <Row
                style={{
                  minHeight: 55,
                  paddingHorizontal: 14,
                  gap: 10,
                  borderRadius: 17,
                  borderWidth: 1,
                  borderColor: errors[row.key]
                    ? colors.danger
                    : colors.glassLine,
                  backgroundColor: colors.glass,
                }}
              >
                <Icon
                  name={row.icon}
                  size={19}
                  color={errors[row.key] ? colors.danger : colors.muted}
                />
                <TextInput
                  testID={"auth-" + row.key}
                  ref={(node) => {
                    refs.current[row.key] = node;
                  }}
                  accessibilityLabel={t(row.label)}
                  editable={!pending}
                  value={fields[row.key]}
                  onChangeText={(value) => {
                    setFields((old) => ({ ...old, [row.key]: value }));
                    setErrors((old) => ({ ...old, [row.key]: undefined }));
                  }}
                  placeholder={
                    row.key === "email" ? "you@example.com" : t(row.label)
                  }
                  placeholderTextColor={colors.muted}
                  secureTextEntry={row.password && !show[row.key]}
                  autoCapitalize={row.key === "fullName" ? "words" : "none"}
                  autoCorrect={false}
                  keyboardType={
                    row.key === "email" ? "email-address" : "default"
                  }
                  autoComplete={
                    row.key === "email"
                      ? "email"
                      : row.password
                        ? register
                          ? "new-password"
                          : "current-password"
                        : row.key === "fullName"
                          ? "name"
                          : "nickname"
                  }
                  textContentType={
                    row.key === "email"
                      ? "emailAddress"
                      : row.password
                        ? register
                          ? "newPassword"
                          : "password"
                        : row.key === "fullName"
                          ? "name"
                          : "nickname"
                  }
                  returnKeyType={index === rows.length - 1 ? "go" : "next"}
                  submitBehavior={
                    index === rows.length - 1 ? "blurAndSubmit" : "submit"
                  }
                  onSubmitEditing={() =>
                    index === rows.length - 1
                      ? void submit()
                      : refs.current[rows[index + 1].key]?.focus()
                  }
                  maxLength={
                    row.key === "fullName"
                      ? 80
                      : row.key === "nickname"
                        ? 24
                        : row.key === "email"
                          ? 254
                          : 128
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 53,
                    color: colors.text,
                    fontSize: 15,
                    fontFamily: font.medium,
                    paddingVertical: 12,
                  }}
                />
                {row.password && (
                  <IconButton
                    icon={show[row.key] ? "eye-off-outline" : "eye-outline"}
                    label={t(
                      show[row.key] ? "authHidePassword" : "authShowPassword",
                    )}
                    onPress={() =>
                      setShow((old) => ({ ...old, [row.key]: !old[row.key] }))
                    }
                  />
                )}
              </Row>
              {errors[row.key] && (
                <Txt size={12} color={colors.danger}>
                  {t(errors[row.key]!)}
                </Txt>
              )}
            </View>
          ))}
          {register && (
            <Txt size={12} muted>
              {t("authPasswordHint")}
            </Txt>
          )}
          <Button
            title={t(
              pending ? "authWorking" : register ? "authRegister" : "authLogin",
            )}
            icon={pending ? "time-outline" : "arrow-forward"}
            disabled={pending}
            onPress={() => void submit()}
          />
          <Row style={{ justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
            <Txt muted size={12}>
              {t(register ? "authHaveAccount" : "authNeedAccount")}
            </Txt>
            <Button
              title={t(register ? "authLogin" : "authRegister")}
              kind="text"
              disabled={pending}
              onPress={() =>
                router.replace({
                  pathname: register ? "/login" : "/register",
                  params: invite ? { invite } : {},
                })
              }
            />
          </Row>
        </GlassSurface>
        <View style={{ marginTop: 20, gap: 8 }}>
          <Button
            title={t("demoEntry")}
            kind="text"
            icon="flask-outline"
            disabled={pending}
            onPress={() =>
              void enterDemo(fields.nickname || undefined)
                .then(() => router.replace("/(tabs)"))
                .catch(() => setFeedback("authTryAgain"))
            }
          />
          <Row style={{ justifyContent: "center", gap: 6 }}>
            <Icon name="lock-closed-outline" size={13} color={colors.muted} />
            <Txt muted size={12}>
              {t("authPrivateHint")}
            </Txt>
          </Row>
        </View>
      </FormScroll>
      <Modal
        visible={!!feedback}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setFeedback("")}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#091C18AA",
            justifyContent: "center",
            padding: 26,
          }}
        >
          <GlassSurface
            style={{
              maxWidth: 400,
              width: "100%",
              alignSelf: "center",
              padding: 26,
              gap: 18,
              backgroundColor: colors.surface,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.dangerSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name="alert-circle-outline"
                size={29}
                color={colors.danger}
              />
            </View>
            <Txt heading size={25} weight="semibold">
              {t("authErrorTitle")}
            </Txt>
            <Txt muted>{t(feedback)}</Txt>
            <Button
              title={t(
                ["authEmailExists", "authCreatedLoginFailed"].includes(feedback)
                  ? "authGoToLogin"
                  : "authCheckAgain",
              )}
              onPress={() => {
                if (
                  ["authEmailExists", "authCreatedLoginFailed"].includes(
                    feedback,
                  )
                )
                  router.replace({
                    pathname: "/login",
                    params: {
                      email: fields.email.trim(),
                      ...(invite ? { invite } : {}),
                    },
                  });
                setFeedback("");
              }}
            />
          </GlassSurface>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

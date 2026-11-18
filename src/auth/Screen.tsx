import React, { useRef, useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { font } from "../theme";
import { Brand, Button, IconButton, Row, Txt } from "../components/ui";
import { loginAccount, registerAccount } from "./actions";
import { useAuth } from "./provider";
import { FormInput, FormScroll } from "../components/keyboard";
import {
  accountError,
  validateAccount,
  type AccountFields,
} from "./validation";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const { t, colors, prefs, updatePrefs, enterDemo } = useApp();
  const { invite, email: initialEmail } = useLocalSearchParams<{
    invite?: string;
    email?: string;
  }>();
  const { setPendingInvite } = useAuth();
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
    [focused, setFocused] = useState<keyof AccountFields>(),
    [feedback, setFeedback] = useState("");
  const submitting = useRef(false);
  const refs = useRef<Partial<Record<keyof AccountFields, TextInput | null>>>(
    {},
  );
  const rows: {
    key: keyof AccountFields;
    label: string;
    password?: boolean;
  }[] = [
    ...(register
      ? [
          {
            key: "fullName" as const,
            label: "authFullName",
          },
          {
            key: "nickname" as const,
            label: "nickname",
          },
        ]
      : []),
    { key: "email", label: "authEmail" },
    {
      key: "password",
      label: "authPassword",
      password: true,
    },
    ...(register
      ? [
          {
            key: "confirmPassword" as const,
            label: "authConfirmPassword",
            password: true,
          },
        ]
      : []),
  ];
  const shouldLogIn = ["authEmailExists", "authCreatedLoginFailed"].includes(
    feedback,
  );
  async function submit() {
    if (submitting.current) return;
    setFeedback("");
    const invalid = validateAccount(fields, register);
    setErrors(invalid);
    const first = rows.find((row) => invalid[row.key]);
    if (first) {
      setFeedback("authCheckFields");
      refs.current[first.key]?.focus();
      return;
    }
    submitting.current = true;
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
      submitting.current = false;
      setPending(false);
    }
  }
  async function openDemo() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setFeedback("");
    try {
      await enterDemo(fields.nickname || undefined);
      router.replace("/(tabs)");
    } catch {
      setFeedback("authTryAgain");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FormScroll
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          width: "100%",
          maxWidth: 510,
          alignSelf: "center",
          flexGrow: 1,
        }}
      >
        <Row between style={{ minHeight: 48 }}>
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
        <View style={{ marginTop: 24, marginBottom: 24, gap: 8 }}>
          <Txt
            heading
            size={32}
            weight="semibold"
            style={{ letterSpacing: -1, lineHeight: 40 }}
          >
            {t(register ? "authRegisterTitle" : "authLoginTitle")}
          </Txt>
          <Txt muted size={15} style={{ maxWidth: 380 }}>
            {t(register ? "authRegisterDescription" : "authLoginDescription")}
          </Txt>
        </View>
        <View style={{ gap: 16 }}>
          {rows.map((row, index) => (
            <View key={row.key} style={{ gap: 6 }}>
              <Txt weight="semibold">{t(row.label)}</Txt>
              <Row
                style={{
                  minHeight: 52,
                  paddingLeft: 12,
                  paddingRight: row.password ? 0 : 12,
                  gap: 4,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: errors[row.key]
                    ? colors.danger
                    : focused === row.key
                      ? colors.accent
                      : colors.controlLine,
                  backgroundColor: colors.surface,
                }}
              >
                <FormInput
                  testID={"auth-" + row.key}
                  ref={(node) => {
                    refs.current[row.key] = node;
                  }}
                  accessibilityLabel={t(row.label)}
                  accessibilityHint={
                    errors[row.key]
                      ? t(errors[row.key]!)
                      : register && row.key === "password"
                        ? t("authPasswordHint")
                        : undefined
                  }
                  onFocus={() => setFocused(row.key)}
                  onBlur={() => setFocused(undefined)}
                  editable={!pending}
                  value={fields[row.key]}
                  onChangeText={(value) => {
                    setFields((old) => ({ ...old, [row.key]: value }));
                    setErrors((old) => ({ ...old, [row.key]: undefined }));
                    setFeedback("");
                  }}
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
                    minHeight: 50,
                    color: colors.text,
                    fontSize: 16,
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
                    disabled={pending}
                    onPress={() =>
                      setShow((old) => ({ ...old, [row.key]: !old[row.key] }))
                    }
                  />
                )}
              </Row>
              {errors[row.key] || (register && row.key === "password") ? (
                <Txt
                  size={13}
                  color={errors[row.key] ? colors.danger : colors.muted}
                >
                  {t(errors[row.key] || "authPasswordHint")}
                </Txt>
              ) : null}
            </View>
          ))}
          {!!feedback && (
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.dangerSoft,
              }}
            >
              <View accessibilityRole="alert">
                <Txt color={colors.danger}>{t(feedback)}</Txt>
              </View>
              {shouldLogIn && (
                <Button
                  title={t("authGoToLogin")}
                  kind="text"
                  onPress={() =>
                    router.replace({
                      pathname: "/login",
                      params: {
                        email: fields.email.trim(),
                        ...(invite ? { invite } : {}),
                      },
                    })
                  }
                />
              )}
            </View>
          )}
          <Button
            title={t(
              pending ? "authWorking" : register ? "authRegister" : "authLogin",
            )}
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
        </View>
        <View
          style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 8 }}
        >
          <Button
            title={t("demoEntry")}
            kind="text"
            disabled={pending}
            onPress={() => void openDemo()}
          />
        </View>
      </FormScroll>
    </SafeAreaView>
  );
}

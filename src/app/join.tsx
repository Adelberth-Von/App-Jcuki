import { useAuth } from "../auth/provider";
import React from "react";
import { View } from "react-native";
import { router, Redirect, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { invitationCode } from "../lib/invitations";
import { Button, Card, Screen, Txt } from "../components/ui";

export default function JoinInvitation() {
  const { code: raw } = useLocalSearchParams<{ code?: string }>();
  const code = invitationCode(typeof raw === "string" ? raw : "");
  const { session } = useAuth();
  const { t, colors, onboarded, demoMode, busy, exitDemo } = useApp();
  const signedIn = Boolean(session && onboarded && !demoMode);
  const joinRoute = {
    pathname: "/connect" as const,
    params: { mode: "join", ...(code && { code }) },
  };
  if (signedIn && code) return <Redirect href={joinRoute} />;

  return (
    <Screen title={t("joinGroup")} back>
      <Card style={{ gap: 16 }}>
        {code ? (
          <View style={{ gap: 4 }}>
            <Txt muted>{t("inviteCode")}</Txt>
            <Txt size={20} weight="semibold">
              {code}
            </Txt>
          </View>
        ) : (
          <View accessibilityRole="alert">
            <Txt color={colors.danger}>{t("inviteInvalidHint")}</Txt>
          </View>
        )}
        <Button
          title={t(signedIn ? "joinWithCode" : "authLogin")}
          disabled={busy}
          onPress={() => {
            if (signedIn) {
              router.replace(joinRoute);
              return;
            }
            void (demoMode ? exitDemo() : Promise.resolve())
              .then(() =>
                router.push({
                  pathname: "/login",
                  params: code ? { invite: code } : {},
                }),
              )
              .catch(() => {});
          }}
        />
      </Card>
    </Screen>
  );
}

import { useAuth } from "../auth/provider";
import React from "react";
import { router, Redirect, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { invitationCode } from "../lib/invitations";
import { Button, Card, Screen, Txt } from "../components/ui";
export default function JoinInvitation() {
  const { code: raw } = useLocalSearchParams<{ code?: string }>();
  const code = invitationCode(typeof raw === "string" ? raw : "");
  const { session } = useAuth();
  const { t, onboarded, demoMode, busy, joinGroup, exitDemo } = useApp();
  if (session && onboarded && !demoMode && code)
    return (
      <Redirect
        href={{ pathname: "/connect", params: { mode: "join", code } }}
      />
    );
  return (
    <Screen title={t("joinGroup")} back>
      <Card>
        <Txt size={24} weight="bold">
          {code || t("invalidInput")}
        </Txt>
        <Txt muted style={{ marginVertical: 16 }}>
          {t("inviteDescription")}
        </Txt>
        {session && onboarded && !demoMode ? (
          <Button
            title={t("join")}
            disabled={busy || !code}
            onPress={() =>
              void joinGroup(code)
                .then(() => router.replace("/(tabs)/groups"))
                .catch(() => {})
            }
          />
        ) : (
          <Button
            title={t("start")}
            disabled={busy || !code}
            onPress={() =>
              void (demoMode ? exitDemo() : Promise.resolve())
                .then(() =>
                  router.push({
                    pathname: "/login",
                    params: { invite: code },
                  }),
                )
                .catch(() => {})
            }
          />
        )}
      </Card>
    </Screen>
  );
}

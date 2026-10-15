import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { invitationCode } from "../lib/invitations";
import { Button, Card, Screen, Txt } from "../components/ui";
export default function JoinInvitation() {
  const { code: raw } = useLocalSearchParams<{ code?: string }>();
  const code = invitationCode(typeof raw === "string" ? raw : "");
  const { t, onboarded, demoMode, busy, joinGroup, exitDemo } = useApp();
  return (
    <Screen title={t("joinGroup")} back>
      <Card>
        <Txt size={24} weight="bold">
          {code || t("invalidInput")}
        </Txt>
        <Txt muted style={{ marginVertical: 16 }}>
          {t("inviteDescription")}
        </Txt>
        {onboarded && !demoMode ? (
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
                    pathname: "/welcome",
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

import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useApp } from "../store";
import { Button, Card, Icon, Row, Txt } from "./ui";

export function GroupStart() {
  const {
    t,
    colors,
    syncStatus,
    refreshing,
    refresh,
    setOverlay,
    demoMode,
    busy,
  } = useApp();
  if (!demoMode && syncStatus !== "ready")
    return (
      <Card style={{ gap: 16 }}>
        <Row>
          {syncStatus === "loading" ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Icon name="cloud-offline-outline" color={colors.peachText} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Txt weight="semibold">
              {t(syncStatus === "loading" ? "syncLoading" : "syncFailed")}
            </Txt>
            <Txt muted size={13}>
              {t(
                syncStatus === "loading" ? "syncLoadingHint" : "syncFailedHint",
              )}
            </Txt>
          </View>
        </Row>
        {syncStatus === "error" && (
          <Button
            title={t("retry")}
            kind="secondary"
            disabled={refreshing}
            onPress={() => void refresh()}
          />
        )}
      </Card>
    );
  return (
    <Card style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Txt heading weight="semibold" size={20}>
          {t("startTogether")}
        </Txt>
        <Txt muted size={14}>
          {t("startTogetherHint")}
        </Txt>
      </View>
      <Button
        title={t("createGroup")}
        icon="add"
        disabled={busy}
        onPress={() => setOverlay({ kind: "createGroup" })}
      />
      <Button
        title={t("joinWithCode")}
        icon="link-outline"
        kind="secondary"
        disabled={busy}
        onPress={() => setOverlay({ kind: "joinGroup" })}
      />
    </Card>
  );
}

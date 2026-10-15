import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useApp } from "../store";
import { Button, Card, Icon, Row, Txt } from "./ui";

export function GroupStart() {
  const { t, colors, syncStatus, refreshing, refresh, setOverlay, demoMode } =
    useApp();
  if (!demoMode && syncStatus !== "ready")
    return (
      <Card>
        <Row>
          {syncStatus === "loading" ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Icon name="cloud-offline-outline" color={colors.peachText} />
          )}
          <View style={{ flex: 1, gap: 6 }}>
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
            style={{ marginTop: 18 }}
            title={t("retry")}
            disabled={refreshing}
            onPress={() => void refresh()}
          />
        )}
      </Card>
    );
  return (
    <Card style={{ padding: 24, gap: 20 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 20,
          backgroundColor: colors.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="people-outline" size={28} color={colors.accent} />
      </View>
      <View style={{ gap: 9 }}>
        <Txt heading weight="semibold" size={27}>
          {t("startTogether")}
        </Txt>
        <Txt muted size={14}>
          {t("startTogetherHint")}
        </Txt>
      </View>
      <View style={{ gap: 14 }}>
        {(["groupStepOne", "groupStepTwo", "groupStepThree"] as const).map(
          (key, i) => (
            <Row key={key} style={{ gap: 12 }}>
              <View
                style={{
                  height: 26,
                  width: 26,
                  borderRadius: 13,
                  backgroundColor: colors.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt color={colors.accent} size={12} weight="semibold">
                  {i + 1}
                </Txt>
              </View>
              <Txt size={13} muted style={{ flex: 1 }}>
                {t(key)}
              </Txt>
            </Row>
          ),
        )}
      </View>
      <Button
        title={t("createGroup")}
        icon="add"
        onPress={() => setOverlay({ kind: "createGroup" })}
      />
      <Button
        title={t("joinWithCode")}
        icon="link-outline"
        kind="secondary"
        onPress={() => setOverlay({ kind: "joinGroup" })}
      />
    </Card>
  );
}

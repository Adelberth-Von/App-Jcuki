import { useAuth } from "../../auth/provider";
import Constants from "expo-constants";
import React, { useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../store";
import {
  requestNotificationPermission,
  sendTestNotification,
} from "../../services/notifications";
import { openUninstallSettings } from "../../services/platformActions";
import { requestAgendaWidget } from "../../services/widget";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  Pill,
  Press,
  Row,
  Screen,
  SectionTitle,
  SelectRow,
  ToggleRow,
  Txt,
} from "../../components/ui";
import { DateControl } from "../../components/DateControl";
import type { AppPreferences } from "../../services/preferences";
export default function Settings() {
  const { session } = useAuth();
  const {
    t,
    prefs,
    profile,
    colors,
    zone,
    demoMode,
    apiUrl,
    offline,
    syncStatus,
    updatePrefs,
    refresh,
    refreshing,
    busy,
    choosePhoto,
    deletePhoto,
    setOverlay,
    notify,
    widgetEnabled,
    setWidgetEnabled,
    pushStatus,
  } = useApp();
  const [testing, setTesting] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const settingsBusy = busy || requestingPermission;
  const change = (p: Partial<AppPreferences>) =>
    void updatePrefs(p).catch(() => {});
  function choice(
    title: string,
    values: [string, string][],
    value: string,
    onSelect: (v: string) => void,
  ) {
    setOverlay({
      kind: "choice",
      title: t(title),
      choices: values.map(([v, k]) => ({ value: v, label: t(k) })),
      value,
      onSelect,
    });
  }
  async function updateNotifications(
    key: "weeklyReminder" | "activityNotifications",
    enabled: boolean,
  ) {
    if (settingsBusy) return;
    setRequestingPermission(true);
    try {
      if (enabled && !(await requestNotificationPermission(prefs.language))) {
        notify(Platform.OS === "web" ? "nativeOnly" : "notificationsDenied");
        return;
      }
      await updatePrefs(
        key === "weeklyReminder"
          ? { weeklyReminder: { ...prefs.weeklyReminder, enabled } }
          : { activityNotifications: enabled },
      ).catch(() => {});
    } catch {
      notify("error");
    } finally {
      setRequestingPermission(false);
    }
  }
  async function sound() {
    setTesting(true);
    try {
      const ok = await sendTestNotification({
        ...prefs,
        notificationSound: true,
      });
      notify(
        ok
          ? "testScheduled"
          : Platform.OS === "web"
            ? "nativeOnly"
            : "notificationsDenied",
      );
    } catch {
      notify("error");
    } finally {
      setTesting(false);
    }
  }
  return (
    <Screen title={t("settings")}>
      <Card>
        <Press
          label={t(session ? "authAccount" : "authRegister")}
          onPress={() => router.push(session ? "/account" : "/register")}
        >
          <Row>
            <Avatar person={profile} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt size={16} weight="semibold">
                {profile.nickname}
              </Txt>
              <Txt muted size={13}>
                {t(session ? "authAccount" : "authRegister")}
              </Txt>
            </View>
            <Icon name="chevron-forward" color={colors.muted} size={18} />
          </Row>
        </Press>
        {!session && (
          <Row style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Button
              title={t("changePhoto")}
              kind="text"
              disabled={busy}
              onPress={() => void choosePhoto()}
            />
            {profile.avatarUri && (
              <Button
                title={t("removePhoto")}
                kind="text"
                disabled={busy}
                onPress={() => void deletePhoto().catch(() => {})}
              />
            )}
          </Row>
        )}
      </Card>
      <Card>
        <SectionTitle title={t("appearance")} />
        <SelectRow
          label={t("theme")}
          value={t(prefs.theme)}
          icon="contrast-outline"
          disabled={settingsBusy}
          onPress={() =>
            choice(
              "theme",
              [
                ["system", "system"],
                ["light", "light"],
                ["dark", "dark"],
              ],
              prefs.theme,
              (value) => change({ theme: value as AppPreferences["theme"] }),
            )
          }
        />
        <Divider />
        <SelectRow
          label={t("language")}
          value={prefs.language === "id" ? "Bahasa Indonesia" : "English"}
          icon="language-outline"
          disabled={settingsBusy}
          onPress={() =>
            setOverlay({
              kind: "choice",
              title: t("language"),
              choices: [
                { value: "id", label: "Bahasa Indonesia" },
                { value: "en", label: "English" },
              ],
              value: prefs.language,
              onSelect: (value) =>
                change({ language: value as AppPreferences["language"] }),
            })
          }
        />
      </Card>
      <Card>
        <SectionTitle title={t("timeRegion")} />
        <Row style={{ paddingVertical: 12 }}>
          <Icon name="globe-outline" color={colors.muted} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt weight="semibold">{t("timeZone")}</Txt>
            <Txt muted size={13}>
              {zone.replace(/_/g, " ")}
            </Txt>
          </View>
        </Row>
        <Divider />
        <SelectRow
          label={t("timeFormat")}
          disabled={settingsBusy}
          value={t(prefs.timeFormat === "24h" ? "h24" : "h12")}
          icon="time-outline"
          onPress={() =>
            choice(
              "timeFormat",
              [
                ["24h", "h24"],
                ["12h", "h12"],
              ],
              prefs.timeFormat,
              (v) => change({ timeFormat: v as "24h" | "12h" }),
            )
          }
        />
      </Card>
      <Card>
        <SectionTitle title={t("reminders")} />
        <ToggleRow
          label={t("activityNotifications")}
          description={t("activityNotificationHint")}
          value={prefs.activityNotifications}
          disabled={settingsBusy}
          onChange={(value) =>
            void updateNotifications("activityNotifications", value)
          }
        />
        {prefs.activityNotifications && (
          <View style={{ marginVertical: 10 }}>
            <Pill
              label={t("push_" + pushStatus)}
              tone={pushStatus === "ready" ? "green" : "peach"}
            />
          </View>
        )}
        <Divider />
        <ToggleRow
          label={t("weeklyReminder")}
          description={t("weeklyDescription")}
          value={prefs.weeklyReminder.enabled}
          disabled={settingsBusy}
          onChange={(value) =>
            void updateNotifications("weeklyReminder", value)
          }
        />
        {prefs.weeklyReminder.enabled && (
          <>
            <SelectRow
              label={t("reminderDay")}
              disabled={settingsBusy}
              value={t("weekday" + (prefs.weeklyReminder.weekday - 1))}
              onPress={() =>
                choice(
                  "reminderDay",
                  Array.from({ length: 7 }, (_, i) => [
                    String(i + 1),
                    "weekday" + i,
                  ]),
                  String(prefs.weeklyReminder.weekday),
                  (v) =>
                    change({
                      weeklyReminder: {
                        ...prefs.weeklyReminder,
                        weekday: Number(v),
                      },
                    }),
                )
              }
            />
            <DateControl
              label={t("reminderTime")}
              mode="time"
              value={
                String(prefs.weeklyReminder.hour).padStart(2, "0") +
                ":" +
                String(prefs.weeklyReminder.minute).padStart(2, "0")
              }
              onChange={(v) => {
                if (/^\d{2}:\d{2}$/.test(v)) {
                  const [hour, minute] = v.split(":").map(Number);
                  if (hour < 24 && minute < 60)
                    change({
                      weeklyReminder: { ...prefs.weeklyReminder, hour, minute },
                    });
                }
              }}
            />
          </>
        )}
        <Divider />
        <ToggleRow
          label={t("notificationSound")}
          value={prefs.notificationSound}
          disabled={settingsBusy}
          onChange={(v) => change({ notificationSound: v })}
        />
        <Button
          title={t("testSound")}
          kind="soft"
          icon="musical-notes-outline"
          disabled={testing || requestingPermission}
          onPress={() => void sound()}
        />
      </Card>
      <Card>
        <SectionTitle title={t("widget")} />
        <ToggleRow
          label={t("widgetDashboard")}
          value={widgetEnabled}
          onChange={setWidgetEnabled}
        />
        <Button
          title={t("addWidget")}
          kind="secondary"
          icon="albums-outline"
          onPress={() => {
            void requestAgendaWidget()
              .then((ok) => {
                if (!ok)
                  notify(Platform.OS === "web" ? "nativeOnly" : "widgetHelp");
              })
              .catch(() => notify("error"));
          }}
        />
        <Txt size={11} muted style={{ marginTop: 12 }}>
          {t("widgetHelp")}
        </Txt>
      </Card>
      {!demoMode && (
        <Card>
          <SectionTitle title={t("connection")} />
          <View style={{ gap: 12 }}>
            <Pill
              label={t(
                syncStatus === "loading" || refreshing
                  ? "syncLoading"
                  : syncStatus === "error" || offline
                    ? "syncFailed"
                    : "syncReady",
              )}
              tone={offline || syncStatus !== "ready" ? "peach" : "green"}
            />
            {!apiUrl && <Txt muted>{t("apiEmpty")}</Txt>}
            <Button
              title={t("refresh")}
              kind="secondary"
              disabled={refreshing || busy}
              onPress={() => void refresh()}
            />
          </View>
        </Card>
      )}
      <Card>
        <SectionTitle title={t("about")} />
        <View style={{ gap: 8 }}>
          <Txt weight="semibold">JCuki</Txt>
          {Constants.expoConfig?.version && (
            <Txt size={13} muted>
              {t("version")} {Constants.expoConfig.version}
            </Txt>
          )}
          <Txt size={13} muted>
            {t("privacy")}
          </Txt>
          <Txt size={13} muted>
            {t("signature")}
          </Txt>
        </View>
        <Button
          title={t("uninstall")}
          kind="text"
          icon="trash-outline"
          textColor={colors.danger}
          onPress={() =>
            setOverlay({
              kind: "confirm",
              title: t("uninstall"),
              description: t(
                Platform.OS === "ios" ? "uninstallIOS" : "uninstallAndroid",
              ),
              onConfirm: async () => {
                try {
                  const result = await openUninstallSettings();
                  if (result === "preview") notify("nativeOnly");
                  setOverlay(null);
                } catch {
                  notify("error");
                }
              },
            })
          }
        />
      </Card>
    </Screen>
  );
}

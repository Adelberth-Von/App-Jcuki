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
  const {
    t,
    prefs,
    profile,
    colors,
    zone,
    demoMode,
    apiUrl,
    offline,
    updatePrefs,
    choosePhoto,
    deletePhoto,
    setOverlay,
    notify,
    widgetEnabled,
    setWidgetEnabled,
  } = useApp();
  const [testing, setTesting] = useState(false);
  const change = (p: Partial<AppPreferences>) =>
    void updatePrefs(p).catch(() => notify("error"));
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
  async function enable(v: boolean) {
    try {
      if (v && !(await requestNotificationPermission(prefs.language))) {
        notify(Platform.OS === "web" ? "nativeOnly" : "notificationsDenied");
        return;
      }
      change({ weeklyReminder: { ...prefs.weeklyReminder, enabled: v } });
    } catch {
      notify("error");
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
    <Screen title={t("settings")} description={t("support")}>
      <Card>
        <Row>
          <Press label={t("choosePhoto")} onPress={() => void choosePhoto()}>
            <Avatar person={profile} size={65} />
          </Press>
          <View style={{ flex: 1 }}>
            <Txt size={20} weight="bold">
              {profile.nickname}
            </Txt>
            <Txt size={11} muted>
              {zone.split("/").at(-1)?.replace(/_/g, " ")}
            </Txt>
          </View>
          <Icon name="sparkles-outline" color={colors.accent} />
        </Row>
        <Row style={{ marginTop: 17, gap: 8 }}>
          <Button
            title={t("changePhoto")}
            kind="soft"
            icon="image-outline"
            onPress={() => void choosePhoto()}
            style={{ flex: 1 }}
          />
          <Button
            title={t("editNickname")}
            kind="secondary"
            onPress={() => router.push("/welcome?edit=1")}
            style={{ flex: 1 }}
          />
        </Row>
        {profile.avatarUri && (
          <Button
            title={t("removePhoto")}
            kind="text"
            onPress={() => void deletePhoto().catch(() => {})}
          />
        )}
      </Card>
      <Card>
        <SectionTitle title={t("appearance")} />
        <Row style={{ gap: 8 }}>
          {(["light", "dark", "system"] as const).map((mode) => (
            <Press
              key={mode}
              label={t(mode)}
              selected={prefs.theme === mode}
              onPress={() => change({ theme: mode })}
              style={{
                flex: 1,
                backgroundColor:
                  prefs.theme === mode ? colors.accentSoft : colors.bg,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: prefs.theme === mode ? colors.accent : colors.line,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 84,
                  gap: 8,
                }}
              >
                <Icon
                  name={
                    mode === "light"
                      ? "sunny-outline"
                      : mode === "dark"
                        ? "moon-outline"
                        : "phone-portrait-outline"
                  }
                  color={prefs.theme === mode ? colors.accent : colors.muted}
                />
                <Txt
                  size={11}
                  weight="medium"
                  color={prefs.theme === mode ? colors.accent : colors.muted}
                >
                  {t(mode)}
                </Txt>
              </View>
            </Press>
          ))}
        </Row>
        <View style={{ marginTop: 12 }}>
          <SelectRow
            label={t("language")}
            value={prefs.language === "id" ? "Bahasa Indonesia" : "English"}
            icon="language-outline"
            onPress={() =>
              setOverlay({
                kind: "choice",
                title: t("language"),
                choices: [
                  { value: "id", label: "Bahasa Indonesia" },
                  { value: "en", label: "English" },
                ],
                value: prefs.language,
                onSelect: (v) => change({ language: v as "id" | "en" }),
              })
            }
          />
        </View>
      </Card>
      <Card>
        <SectionTitle
          title={t("timeRegion")}
          description={t("zoneDescription")}
        />
        <SelectRow
          label={t("timeZone")}
          value={
            prefs.timeZone === "auto"
              ? t("autoZone")
              : zone.split("/").at(-1)?.replace(/_/g, " ") || zone
          }
          icon="globe-outline"
          onPress={() => setOverlay({ kind: "zone" })}
        />
        <Divider />
        <SelectRow
          label={t("timeFormat")}
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
          label={t("weeklyReminder")}
          description={t("weeklyDescription")}
          value={prefs.weeklyReminder.enabled}
          onChange={(v) => void enable(v)}
        />
        <Divider />
        <SelectRow
          label={t("reminderDay")}
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
        <Divider />
        <SelectRow
          label={t("eventReminder")}
          value={prefs.eventReminderMinutes + " " + t("minute")}
          onPress={() =>
            setOverlay({
              kind: "choice",
              title: t("eventReminder"),
              choices: [5, 15, 30, 60].map((v) => ({
                value: String(v),
                label: v + " " + t("minute"),
              })),
              value: String(prefs.eventReminderMinutes),
              onSelect: (v) => change({ eventReminderMinutes: Number(v) }),
            })
          }
        />
        <Divider />
        <ToggleRow
          label={t("notificationSound")}
          description={t("soundDescription")}
          value={prefs.notificationSound}
          onChange={(v) => change({ notificationSound: v })}
        />
        <Button
          title={t("testSound")}
          kind="soft"
          icon="musical-notes-outline"
          disabled={testing}
          onPress={() => void sound()}
        />
      </Card>
      <Card>
        <SectionTitle
          title={t("widget")}
          description={t("widgetDescription")}
        />
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
      <Card>
        <SectionTitle title={t("connection")} />
        <Row between style={{ marginBottom: 10 }}>
          <Pill
            label={
              demoMode ? t("demoMode") : offline ? t("offline") : t("cloud")
            }
            tone={demoMode || offline ? "peach" : "green"}
          />
          <Icon name="cloud-outline" color={colors.muted} />
        </Row>
        <Txt size={11} muted>
          {apiUrl ? apiUrl : t("apiEmpty")}
        </Txt>
        <Button
          title={demoMode ? t("apiConnect") : t("reconnect")}
          kind="secondary"
          style={{ marginTop: 14 }}
          onPress={() => setOverlay({ kind: "connection" })}
        />
        <Txt size={10} muted style={{ marginTop: 12 }}>
          {t("deviceIdentity")}
        </Txt>
      </Card>
      <Card>
        <SectionTitle title={t("about")} />
        <Row>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              backgroundColor: colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="link" color={colors.accent} size={29} />
          </View>
          <View>
            <Txt size={18} weight="bold">
              JCuki
            </Txt>
            <Txt size={11} muted>
              {t("version")}
            </Txt>
          </View>
        </Row>
        <Txt size={12} muted style={{ marginTop: 14 }}>
          {t("privacy")}
        </Txt>
        <Txt size={12} weight="semibold" style={{ marginTop: 14 }}>
          {t("signature")}
        </Txt>
      </Card>
      <Button
        title={t("uninstall")}
        kind="danger"
        icon="trash-outline"
        onPress={() =>
          setOverlay({
            kind: "confirm",
            title: t("uninstall"),
            description: t(
              Platform.OS === "ios" ? "uninstallIOS" : "uninstallAndroid",
            ),
            onConfirm: async () => {
              const result = await openUninstallSettings();
              if (result === "preview") notify("nativeOnly");
              setOverlay(null);
            },
          })
        }
      />
      <View style={{ height: 10 }} />
    </Screen>
  );
}

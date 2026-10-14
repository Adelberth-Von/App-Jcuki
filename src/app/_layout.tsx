import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import * as Notifications from "expo-notifications";
import { AppProvider, useApp } from "../store";
import { MotionProvider, useReducedMotion } from "../hooks/useReducedMotion";
import { LaunchScreen } from "../components/brand";
import { Toast } from "../components/ui";
import { OverlayHost } from "../components/overlays";
import { localDate, playingSlots } from "../lib/domain";
import { dayText } from "../components/schedule";
import { useMinuteClock } from "../hooks/useMinuteClock";
import { syncAgendaWidget } from "../services/widget";

function AppShell() {
  const {
    ready,
    dark,
    colors,
    t,
    group,
    profile,
    prefs,
    time,
    widgetEnabled,
    setOverlay,
    switchGroup,
  } = useApp();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [launchDone, setLaunchDone] = useState(false);
  const finishLaunch = useCallback(() => setLaunchDone(true), []);
  const appReady = ready && !!(fontsLoaded || fontError);
  const reduced = useReducedMotion();
  const now = useMinuteClock();
  const lastWidgetPayload = useRef("");
  useEffect(() => {
    if (!ready) return;
    const own = group?.members.find((m) => m.id === profile.id);
    const next = widgetEnabled
      ? own?.daysOff
          ?.filter((d) => d.date >= localDate(now, d.zone))
          .sort((a, b) => a.date.localeCompare(b.date))[0]
      : undefined;
    const slots = next && own ? playingSlots(own.slots, next) : [];
    const payload = {
      title: next ? t("dayOff") : "",
      dateText: next
        ? dayText(next.date, prefs.language, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
        : "",
      timeText: next
        ? slots.length
          ? time(slots[0].start) + " – " + time(slots[0].end)
          : t("noPlayTimeYet")
        : "",
      groupName: next ? group?.name || "" : "",
      emptyLabel: t("widgetEmpty"),
      dark,
    };
    const serialized = JSON.stringify(payload);
    if (lastWidgetPayload.current === serialized) return;
    lastWidgetPayload.current = serialized;
    void syncAgendaWidget(payload).catch(() => {
      lastWidgetPayload.current = "";
    });
  }, [
    ready,
    dark,
    t,
    group,
    profile.id,
    prefs.language,
    time,
    widgetEnabled,
    now,
  ]);
  useEffect(() => {
    if (!appReady || !launchDone) return;
    const route = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data || {};
      if (data.kind === "event" && typeof data.eventId === "string") {
        router.push("/(tabs)");
        const show = () =>
          setOverlay({ kind: "details", id: String(data.eventId) });
        if (
          typeof data.groupId === "string" &&
          data.groupId &&
          data.groupId !== group?.id
        )
          void switchGroup(data.groupId)
            .then(show)
            .catch(() => {});
        else show();
      } else if (data.kind === "activity") {
        const show = () => router.push("/activity");
        if (typeof data.groupId === "string" && data.groupId !== group?.id)
          void switchGroup(data.groupId)
            .then(show)
            .catch(() => {});
        else {
          show();
        }
      } else if (data.kind === "test") router.push("/(tabs)/settings");
      else router.push("/(tabs)/calendar");
    };
    const sub = Notifications.addNotificationResponseReceivedListener(route);
    void Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          route(r);
          void Notifications.clearLastNotificationResponseAsync().catch(
            () => {},
          );
        }
      })
      .catch(() => {});
    return () => sub.remove();
  }, [appReady, launchDone, group?.id, setOverlay, switchGroup]);

  return (
    <>
      {appReady && (
        <>
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduced ? "none" : "fade",
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="agenda" />
            <Stack.Screen name="activity" />
          </Stack>
          <OverlayHost />
          <Toast />
        </>
      )}
      {!launchDone && (
        <LaunchScreen ready={appReady} onFinished={finishLaunch} />
      )}
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MotionProvider>
          <AppShell />
        </MotionProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

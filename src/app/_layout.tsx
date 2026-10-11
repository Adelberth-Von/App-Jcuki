import React, { useEffect } from "react";
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
import { LoadingScreen, Toast } from "../components/ui";
import { OverlayHost } from "../components/overlays";
import { eventState } from "../lib/domain";
import { syncAgendaWidget } from "../services/widget";

function AppShell() {
  const {
    ready,
    dark,
    t,
    group,
    profile,
    date,
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
  useEffect(() => {
    if (!ready) return;
    const next = widgetEnabled
      ? group?.events
          .filter(
            (e) =>
              eventState(e, group.members) === "confirmed" &&
              e.responses[profile.id] === "yes",
          )
          .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
      : undefined;
    void syncAgendaWidget({
      title: next?.title || "JCuki",
      dateText: next ? date(next.start) : "",
      timeText: next ? time(next.start) + " – " + time(next.end) : "",
      groupName: next ? group?.name || "" : "",
      emptyLabel: t("widgetEmpty"),
      dark,
    }).catch(() => {});
  }, [ready, dark, t, group, profile.id, date, time, widgetEnabled]);
  useEffect(() => {
    if (!ready) return;
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
  }, [ready, group?.id, setOverlay, switchGroup]);
  if (!ready || (!fontsLoaded && !fontError)) return <LoadingScreen />;
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: dark ? "#12131C" : "#F6F6FA" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="agenda" />
      </Stack>
      <OverlayHost />
      <Toast />
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

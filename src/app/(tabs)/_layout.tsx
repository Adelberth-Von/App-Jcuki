import React from "react";
import { useWindowDimensions, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../store";
import { Icon, type IconName } from "../../components/ui";
import { font } from "../../theme";
export default function TabLayout() {
  const { colors, t } = useApp();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const tabs: [string, string, IconName][] = [
    ["index", "dashboard", "home-outline"],
    ["calendar", "calendar", "calendar-outline"],
    ["groups", "groups", "people-outline"],
    ["settings", "settings", "options-outline"],
  ];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 48 + Math.ceil(16 * fontScale) + insets.bottom,
          paddingTop: 4,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: {
          fontFamily: font.semibold,
          fontSize: 12,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tabs.map(([name, key, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(key),
            tabBarAccessibilityLabel: t(key),
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: focused ? colors.accentSoft : "transparent",
                }}
              >
                <Icon name={icon} color={color} size={22} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import React, { useEffect, useState } from "react";
import { Animated, Keyboard, Platform, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../store";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { GlassSurface } from "./glass";
import { Icon, Press, Txt, type IconName } from "./ui";
type Props = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];
const icons: Record<string, IconName> = {
  index: "home-outline",
  calendar: "calendar-outline",
  groups: "people-outline",
  settings: "options-outline",
};
export function LiquidNavigation({ state, navigation, descriptors }: Props) {
  const colors = useColors(),
    insets = useSafeAreaInsets(),
    reduced = useReducedMotion();
  const [width, setWidth] = useState(0),
    [keyboard, setKeyboard] = useState(false);
  const [x] = useState(() => new Animated.Value(0));
  const cell = width / state.routes.length;
  useEffect(() => {
    if (reduced) x.setValue(state.index * cell);
    else
      Animated.spring(x, {
        toValue: state.index * cell,
        useNativeDriver: true,
        stiffness: 240,
        damping: 27,
        mass: 0.8,
      }).start();
  }, [state.index, cell, reduced, x]);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboard(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboard) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 12),
        left: 14,
        right: 14,
        alignItems: "center",
      }}
    >
      <GlassSurface
        chrome
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 38,
          padding: 7,
          shadowColor: "#0B2B20",
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <View
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          style={{ flexDirection: "row", height: 64 }}
        >
          {width > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: cell,
                borderRadius: 29,
                backgroundColor: colors.navActive,
                borderWidth: 1,
                borderColor: colors.glassLine,
                transform: [{ translateX: x }],
              }}
            />
          )}
          {state.routes.map((route, index) => {
            const selected = index === state.index,
              options = descriptors[route.key].options;
            const label = options.title || route.name;
            const icon = selected
              ? ((icons[route.name] || "ellipse-outline").replace(
                  "-outline",
                  "",
                ) as IconName)
              : icons[route.name] || "ellipse-outline";
            return (
              <Press
                key={route.key}
                role="tab"
                label={options.tabBarAccessibilityLabel || label}
                selected={selected}
                style={{ flex: 1, borderRadius: 29 }}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!selected && !event.defaultPrevented)
                    navigation.navigate(route.name, route.params);
                }}
              >
                <View
                  style={{ alignItems: "center", gap: 4, paddingVertical: 8 }}
                >
                  <Icon
                    name={icon}
                    size={22}
                    color={selected ? colors.accent : colors.muted}
                  />
                  <Txt
                    size={11}
                    weight={selected ? "semibold" : "medium"}
                    color={selected ? colors.accent : colors.muted}
                  >
                    {label}
                  </Txt>
                </View>
              </Press>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

import React, { useEffect, useState } from "react";
import { Animated, Image, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../store";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/brand-mark.png")}
      resizeMode="contain"
      accessibilityLabel="JCuki"
      style={{ width: size, height: size, borderRadius: size * 0.27 }}
    />
  );
}
export function LaunchScreen({
  ready = false,
  onFinished,
}: {
  ready?: boolean;
  onFinished?: () => void;
}) {
  const { colors, t } = useApp();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced || ready) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced, ready]);
  useEffect(() => {
    if (!ready || !onFinished) return;
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: reduced ? 0 : 220,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onFinished();
    });
    return () => animation.stop();
  }, [ready, reduced, opacity, onFinished]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        opacity,
        backgroundColor: colors.bg,
      }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t("launchLoading")}
          style={{ alignItems: "center" }}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: -22,
              width: 174,
              height: 174,
              borderRadius: 87,
              borderWidth: 1,
              borderColor: colors.line,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 0.9],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            }}
          />
          <Animated.View
            style={{
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.035],
                  }),
                },
              ],
            }}
          >
            <LogoMark size={130} />
          </Animated.View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: "700",
              letterSpacing: -1.3,
              color: colors.text,
              marginTop: 28,
            }}
          >
            JCuki.
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.muted,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {t("tagline")}
          </Text>
          <View
            aria-hidden
            style={{ flexDirection: "row", gap: 8, marginTop: 30 }}
          >
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.accent,
                  opacity: reduced
                    ? 0.65
                    : pulse.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: i === 1 ? [0.3, 1, 0.3] : [1, 0.3, 1],
                      }),
                }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 16 }}>
            {t("launchLoading")}
          </Text>
        </View>
        <Text
          style={{
            position: "absolute",
            bottom: 34,
            fontSize: 12,
            color: colors.muted,
          }}
        >
          {t("signature")}
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
}

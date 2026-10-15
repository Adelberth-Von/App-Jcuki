import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView, BlurTargetView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { useColors } from "../store";
const Context = createContext<{
  target: RefObject<View | null> | null;
  setTarget: (target: RefObject<View | null>) => void;
  reduced: boolean;
}>({ target: null, setTarget: () => {}, reduced: false });
export function GlassProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<RefObject<View | null> | null>(null),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let live = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (live) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduced,
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return (
    <Context.Provider value={{ target, setTarget, reduced }}>
      {children}
    </Context.Provider>
  );
}
export function GlassTarget({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<View | null>(null),
    focused = useIsFocused(),
    { setTarget } = useContext(Context);
  useEffect(() => {
    if (focused) setTarget(ref);
  }, [focused, setTarget]);
  return (
    <BlurTargetView ref={ref} style={style}>
      {children}
    </BlurTargetView>
  );
}
export function AmbientBackground() {
  const colors = useColors();
  const dark = colors.bg === "#13221E";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={
          dark
            ? ["#10231E", "#1C3029", "#13221E"]
            : ["#F6F7EF", "#E4EEE3", "#F1EEE9"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: "absolute",
          width: 330,
          height: 330,
          borderRadius: 165,
          top: -115,
          right: -130,
          backgroundColor: dark ? "#3B695333" : "#C6DEC666",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: 125,
          bottom: 80,
          left: -150,
          backgroundColor: dark ? "#57635322" : "#E8DAB244",
        }}
      />
    </View>
  );
}
export function GlassBackground({ chrome = false }: { chrome?: boolean }) {
  const colors = useColors(),
    dark = colors.bg === "#13221E",
    { target, reduced } = useContext(Context);
  const native =
    Platform.OS === "ios" &&
    !reduced &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();
  if (native)
    return (
      <GlassView
        pointerEvents="none"
        colorScheme={dark ? "dark" : "light"}
        glassEffectStyle="regular"
        style={StyleSheet.absoluteFill}
      />
    );
  if (chrome && !reduced && (Platform.OS !== "android" || target))
    return (
      <BlurView
        pointerEvents="none"
        tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        intensity={70}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={target || undefined}
        style={StyleSheet.absoluteFill}
      />
    );
  return null;
}
export function GlassSurface({
  children,
  style,
  chrome = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  chrome?: boolean;
}) {
  const colors = useColors();
  const { reduced } = useContext(Context);
  const background = StyleSheet.flatten(style)?.backgroundColor;
  const translucent = !background || background === colors.glass;
  return (
    <View
      style={[
        {
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.glassLine,
          backgroundColor: reduced ? colors.surface : colors.glass,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {(chrome || translucent) && <GlassBackground chrome={chrome} />}
      {translucent && (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glassShine, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

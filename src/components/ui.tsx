import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { goBack } from "../navigation";
import { useApp } from "../store";
import { font } from "../theme";
import type { Profile } from "../lib/types";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 21,
  color,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const { colors } = useApp();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color || colors.text}
      accessible={false}
    />
  );
}
export function Txt({
  children,
  size = 14,
  weight = "regular",
  muted = false,
  color,
  style,
  heading = false,
  numberOfLines,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: keyof typeof font;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  heading?: boolean;
  numberOfLines?: number;
}) {
  const { colors } = useApp();
  const readableSize = Math.max(12, size);
  return (
    <Text
      accessibilityRole={heading ? "header" : undefined}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: font[weight],
          fontSize: readableSize,
          lineHeight: readableSize * 1.5,
          color: color || (muted ? colors.muted : colors.text),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  between = false,
  style,
}: {
  children: React.ReactNode;
  between?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 12 },
        between && { justifyContent: "space-between" },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 20,
          padding: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Press({
  onPress,
  children,
  style,
  label,
  disabled = false,
  selected = false,
  role = "button",
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  label?: string;
  disabled?: boolean;
  selected?: boolean;
  role?: "button" | "tab" | "switch";
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 35,
      bounciness: 0,
    }).start();
  return (
    <Animated.View
      style={[{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={role}
        aria-checked={role === "switch" ? selected : undefined}
        accessibilityLabel={label}
        accessibilityState={{
          disabled,
          selected,
          ...(role === "switch" ? { checked: selected } : {}),
        }}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        style={({ pressed }) => [
          {
            minHeight: 48,
            minWidth: 48,
            opacity: pressed ? 0.85 : 1,
            justifyContent: "center",
          },
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
export function Button({
  title,
  onPress,
  kind = "primary",
  icon,
  disabled = false,
  style,
  textColor,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "soft" | "danger" | "text";
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
}) {
  const { colors } = useApp();
  const bg =
      kind === "primary"
        ? colors.accent
        : kind === "soft"
          ? colors.accentSoft
          : kind === "danger"
            ? colors.dangerSoft
            : kind === "secondary"
              ? colors.surface
              : "transparent",
    color =
      textColor ||
      (kind === "primary"
        ? colors.onAccent
        : kind === "danger"
          ? colors.danger
          : kind === "secondary"
            ? colors.text
            : colors.accent);
  return (
    <Press
      label={title}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          borderRadius: 16,
          backgroundColor: bg,
          borderWidth: kind === "secondary" ? 1 : 0,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      <Row
        style={{
          minHeight: 52,
          justifyContent: "center",
          paddingHorizontal: 18,
          paddingVertical: 12,
          gap: 9,
        }}
      >
        {icon && <Icon name={icon} color={color} size={19} />}
        <Txt weight="semibold" size={13} color={color}>
          {title}
        </Txt>
      </Row>
    </Press>
  );
}
export function IconButton({
  icon,
  onPress,
  label,
  color,
  soft = false,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  soft?: boolean;
}) {
  const { colors } = useApp();
  return (
    <Press
      label={label}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        backgroundColor: soft ? colors.accentSoft : "transparent",
        borderRadius: 16,
      }}
    >
      <View style={{ alignItems: "center" }}>
        <Icon name={icon} color={color || colors.accent} />
      </View>
    </Press>
  );
}
export function Avatar({
  person,
  size = 42,
}: {
  person: Pick<Profile, "nickname" | "avatarUri"> & { color?: string };
  size?: number;
}) {
  const { colors, imageHeaders } = useApp();
  const [failedUri, setFailedUri] = useState<string | undefined>(undefined);
  const failed = !!person.avatarUri && failedUri === person.avatarUri;
  const name = person.nickname || "You",
    initials = name
      .trim()
      .split(/\s+/)
      .map((x) => Array.from(x)[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    tones: Record<string, [string, string]> = {
      blue: ["#E6EFF7", "#426687"],
      peach: ["#F9E9DC", "#8F6146"],
      green: ["#E9F4ED", "#367C54"],
    };
  const [bg, fg] = tones[person.color || ""] || [
    colors.accentSoft,
    colors.accent,
  ];
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {person.avatarUri && !failed ? (
        <Image
          source={{
            uri: person.avatarUri,
            ...(/^https?:/.test(person.avatarUri)
              ? { headers: imageHeaders }
              : {}),
          }}
          onError={() => setFailedUri(person.avatarUri)}
          style={{ width: size, height: size }}
          accessibilityLabel={name}
        />
      ) : (
        <Txt weight="semibold" size={size * 0.3} color={fg}>
          {initials}
        </Txt>
      )}
    </View>
  );
}
export function Brand() {
  const { colors } = useApp();
  return (
    <Row style={{ gap: 9 }}>
      <View
        style={{
          width: 33,
          height: 33,
          backgroundColor: colors.accent,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="link" color={colors.onAccent} size={23} />
      </View>
      <Txt size={23} weight="bold" style={{ letterSpacing: -1 }}>
        JCuki
        <Txt color={colors.accent} size={23} weight="bold">
          .
        </Txt>
      </Txt>
    </Row>
  );
}
export function Pill({
  label,
  tone = "accent",
  dot = true,
}: {
  label: string;
  tone?: "accent" | "green" | "peach" | "muted";
  dot?: boolean;
}) {
  const { colors } = useApp();
  const color =
    tone === "green"
      ? colors.green
      : tone === "peach"
        ? colors.peachText
        : tone === "muted"
          ? colors.muted
          : colors.accent;
  return (
    <Row
      style={{
        gap: 5,
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor:
          tone === "green"
            ? colors.greenSoft
            : tone === "peach"
              ? colors.peach
              : tone === "muted"
                ? colors.surfaceAlt
                : colors.accentSoft,
      }}
    >
      {dot && (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      )}
      <Txt size={10} weight="semibold" color={color}>
        {label}
      </Txt>
    </Row>
  );
}
export function SectionTitle({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Row between style={{ marginBottom: 15, gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Txt size={18} weight="bold" heading style={{ letterSpacing: -0.5 }}>
          {title}
        </Txt>
        {description && (
          <Txt size={11} muted style={{ marginTop: 3 }}>
            {description}
          </Txt>
        )}
      </View>
      {action && (
        <Button
          title={action}
          onPress={onAction || (() => {})}
          kind="text"
          style={{ marginRight: -10 }}
        />
      )}
    </Row>
  );
}
export function Header({ back = false }: { back?: boolean }) {
  const { profile, t } = useApp();
  return (
    <Row between style={{ paddingHorizontal: 20, height: 72 }}>
      {back ? (
        <IconButton icon="arrow-back" label={t("back")} onPress={goBack} />
      ) : (
        <Brand />
      )}
      <Row style={{ gap: 6 }}>
        <IconButton
          icon="notifications-outline"
          label={t("reminders")}
          onPress={() => router.push("/(tabs)/settings")}
        />
        <Press
          label={t("profile")}
          onPress={() => router.push("/welcome?edit=1")}
        >
          <Avatar person={profile} size={38} />
        </Press>
      </Row>
    </Row>
  );
}
export function Screen({
  children,
  title,
  description,
  action,
  back = false,
  scroll = true,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  action?: { title: string; onPress: () => void; icon?: IconName };
  back?: boolean;
  scroll?: boolean;
}) {
  const { colors, refreshing, refresh } = useApp();
  const inset = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View
        style={{ flex: 1, width: "100%", maxWidth: 820, alignSelf: "center" }}
      >
        <Header back={back} />
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={colors.accent}
              />
            }
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: action ? 105 : 30,
              gap: 22,
            }}
          >
            {title && (
              <View>
                <Txt
                  size={30}
                  weight="bold"
                  heading
                  style={{ letterSpacing: -1.1 }}
                >
                  {title}
                </Txt>
                {description && (
                  <Txt size={12} muted style={{ marginTop: 7 }}>
                    {description}
                  </Txt>
                )}
              </View>
            )}
            {children}
          </ScrollView>
        ) : (
          children
        )}
        {action && (
          <View
            style={{
              position: "absolute",
              bottom: 12,
              left: 20,
              right: 20,
              backgroundColor: colors.bg,
              paddingTop: 8,
              borderRadius: 18,
            }}
          >
            <Button
              title={action.title}
              onPress={action.onPress}
              icon={action.icon || "add"}
              style={{ boxShadow: "0 4px 12px rgba(20,60,40,0.10)" }}
            />
          </View>
        )}
      </View>
      {inset.bottom > 0 && back ? (
        <View style={{ height: inset.bottom }} />
      ) : null}
    </SafeAreaView>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 7 }}>
      <Txt size={12} weight="semibold">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          {
            minHeight: 54,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.bg,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontFamily: font.medium,
            fontSize: 14,
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
export function SelectRow({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  onPress: () => void;
  icon?: IconName;
}) {
  const { colors } = useApp();
  return (
    <Press label={label + ": " + value} onPress={onPress}>
      <Row between style={{ paddingVertical: 12, minHeight: 56 }}>
        {icon && <Icon name={icon} color={colors.muted} />}
        <Txt size={13} weight="medium" style={{ flex: 1 }}>
          {label}
        </Txt>
        <Txt size={12} muted style={{ maxWidth: "52%" }}>
          {value}
        </Txt>
        <Icon name="chevron-forward" color={colors.muted} size={17} />
      </Row>
    </Press>
  );
}
export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useApp();
  return (
    <Row between style={{ minHeight: 62, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt size={13} weight="semibold">
          {label}
        </Txt>
        {description && (
          <Txt size={11} muted style={{ marginTop: 3 }}>
            {description}
          </Txt>
        )}
      </View>
      <Press
        label={label}
        role="switch"
        selected={value}
        onPress={() => onChange(!value)}
      >
        <View
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            minWidth: 52,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Switch
            value={value}
            accessible={false}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.line}
          />
        </View>
      </Press>
    </Row>
  );
}
export function Divider() {
  const { colors } = useApp();
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}
export function Empty({
  title,
  description,
  icon = "calendar-outline",
  action,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  action?: { title: string; onPress: () => void };
}) {
  const { colors } = useApp();
  return (
    <View style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accentSoft,
          marginBottom: 7,
        }}
      >
        <Icon name={icon} color={colors.accent} size={25} />
      </View>
      <Txt weight="semibold" size={14} style={{ textAlign: "center" }}>
        {title}
      </Txt>
      {description && (
        <Txt size={12} muted style={{ textAlign: "center", maxWidth: 280 }}>
          {description}
        </Txt>
      )}
      {action && (
        <Button
          title={action.title}
          onPress={action.onPress}
          kind="soft"
          style={{ marginTop: 10 }}
        />
      )}
    </View>
  );
}
export function Skeleton({
  height = 100,
  width = "100%",
}: {
  height?: number;
  width?: number | `${number}%`;
}) {
  const { colors } = useApp();
  const [value] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!reduce) {
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 0.4,
              duration: 650,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 1,
              duration: 650,
              useNativeDriver: true,
            }),
          ]),
        );
        loop.start();
      }
    });
    return () => loop?.stop();
  }, [value]);
  return (
    <Animated.View
      style={{
        height,
        width,
        borderRadius: 20,
        backgroundColor: colors.surfaceAlt,
        opacity: value,
      }}
    />
  );
}
export function LoadingScreen() {
  const { colors } = useApp();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 22 }}
    >
      <Brand />
      <Skeleton height={35} width="65%" />
      <Skeleton height={220} />
      <Skeleton height={160} />
    </SafeAreaView>
  );
}
export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (n: number) => void;
}) {
  const { t, colors } = useApp();
  if (pages < 2) return null;
  return (
    <Row
      between
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      <Button
        title={t("previous")}
        onPress={() => onPage(page - 1)}
        kind="text"
        disabled={page === 1}
      />
      <Txt size={11} muted>
        {t("page")} {page} {t("of")} {pages}
      </Txt>
      <Button
        title={t("next")}
        onPress={() => onPage(page + 1)}
        kind="text"
        disabled={page === pages}
      />
    </Row>
  );
}
export function Toast() {
  const { message, colors } = useApp();
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        bottom: 100 + insets.bottom,
        left: 20,
        right: 20,
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <View
        style={{
          maxWidth: 500,
          backgroundColor: colors.text,
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: 16,
        }}
      >
        <Txt size={12} color={colors.surface}>
          {message}
        </Txt>
      </View>
    </View>
  );
}
export function KeyboardForm({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

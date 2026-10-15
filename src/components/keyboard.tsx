import React from "react";
import { Platform, ScrollView, View, type ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";

export function AppKeyboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === "web") return <>{children}</>;
  return (
    <KeyboardProvider
      preload={false}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {children}
    </KeyboardProvider>
  );
}
export function FormScroll({ children, ...props }: ScrollViewProps) {
  if (Platform.OS === "web")
    return (
      <ScrollView keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </ScrollView>
    );
  return (
    <KeyboardAwareScrollView
      bottomOffset={28}
      disableScrollOnKeyboardHide
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
export function SheetKeyboard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof View>["style"];
}) {
  if (Platform.OS === "web") return <View style={style}>{children}</View>;
  return (
    <KeyboardAvoidingView behavior="height" automaticOffset style={style}>
      {children}
    </KeyboardAvoidingView>
  );
}

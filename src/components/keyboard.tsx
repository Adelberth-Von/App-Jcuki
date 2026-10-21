import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
  KeyboardAvoidingView,
  type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";

const RevealInputContext = createContext<(input: TextInput | null) => void>(
  () => {},
);

/** Empty secure fields can omit Android's selection event when Next changes focus. */
export const FormInput = forwardRef<TextInput, TextInputProps>(
  function FormInput(props, ref) {
    const reveal = useContext(RevealInputContext);
    const input = useRef<TextInput | null>(null);
    const attach = useCallback(
      (node: TextInput | null) => {
        input.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    return (
      <TextInput
        {...props}
        ref={attach}
        onFocus={(event) => {
          props.onFocus?.(event);
          reveal(input.current);
        }}
      />
    );
  },
);

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
export function FormScroll({ children, onScroll, ...props }: ScrollViewProps) {
  const nativeScroll = useRef<KeyboardAwareScrollViewRef>(null);
  const focused = useRef<TextInput | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | null>(null);
  const reveal = useCallback((input: TextInput | null) => {
    focused.current = input;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!input?.isFocused()) return;
      // Measure the full input, independent of caret/selection events from empty secure fields.
      input.measureInWindow((_x, y, _width, height) => {
        const keyboardTop = Keyboard.metrics()?.screenY;
        if (!input.isFocused() || !keyboardTop || !height) return;
        const overlap = y + height + 28 - keyboardTop;
        if (overlap > 1)
          nativeScroll.current?.scrollTo({
            y: Math.max(0, offset.current + overlap),
            animated: true,
          });
      });
    });
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const shown = Keyboard.addListener("keyboardDidShow", () =>
      reveal(focused.current),
    );
    return () => {
      shown.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);
  if (Platform.OS === "web")
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        {...props}
        onScroll={onScroll}
      >
        {children}
      </ScrollView>
    );
  return (
    <RevealInputContext.Provider value={reveal}>
      <KeyboardAwareScrollView
        ref={nativeScroll}
        bottomOffset={28}
        disableScrollOnKeyboardHide
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        {...props}
        scrollEventThrottle={16}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
      >
        {children}
      </KeyboardAwareScrollView>
    </RevealInputContext.Provider>
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

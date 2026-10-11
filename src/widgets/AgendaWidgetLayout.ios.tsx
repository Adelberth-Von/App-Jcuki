import { Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { AgendaWidgetPayload } from "./types";

const AgendaLayout = (
  props: AgendaWidgetPayload,
  environment: WidgetEnvironment,
) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const foreground = dark ? "#F3F3FA" : "#222334";
  const muted = dark ? "#B1B4C7" : "#696B7F";
  const accent = dark ? "#ACA6FF" : "#5B51D8";
  const hasPlan = Boolean(props.title);
  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[
        frame({
          maxWidth: Infinity,
          maxHeight: Infinity,
          alignment: "leading",
        }),
        containerBackground(dark ? "#1C1E2A" : "#FFFFFF", "widget"),
        accessibilityElement("combine"),
        widgetURL("jcuki://dashboard"),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 13, weight: "bold" }),
          foregroundStyle(accent),
        ]}
      >
        JCuki
      </Text>
      <Text
        modifiers={[
          font({
            size: environment.widgetFamily === "systemSmall" ? 17 : 20,
            weight: "bold",
          }),
          foregroundStyle(foreground),
          lineLimit(2),
        ]}
      >
        {hasPlan
          ? props.title
          : props.emptyLabel || "Your next plan starts here"}
      </Text>
      {hasPlan ? (
        <VStack alignment="leading" spacing={3}>
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(muted),
              lineLimit(1),
            ]}
          >
            {props.dateText}
          </Text>
          <Text
            modifiers={[
              font({ size: 17, weight: "semibold" }),
              foregroundStyle(foreground),
              lineLimit(1),
            ]}
          >
            {props.timeText}
          </Text>
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(muted),
              lineLimit(1),
            ]}
          >
            {props.groupName}
          </Text>
        </VStack>
      ) : null}
    </VStack>
  );
};

export default createWidget("JCukiAgenda", AgendaLayout);

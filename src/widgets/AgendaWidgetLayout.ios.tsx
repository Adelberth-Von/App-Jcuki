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
  const foreground = dark ? "#F1F6F0" : "#182C25";
  const muted = dark ? "#ADBCB2" : "#617068";
  const accent = dark ? "#8FDAB5" : "#185F50";
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
        containerBackground(dark ? "#192720" : "#FFFFFF", "widget"),
        accessibilityElement("combine"),
        widgetURL("jcuki://calendar"),
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
          : props.emptyLabel || "No confirmed days off yet"}
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

import React, { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useApp } from "../store";
import { SelectRow, Button } from "./ui";
import { dayText } from "./schedule";

export function DateControl({
  label,
  mode,
  value,
  onChange,
}: {
  label: string;
  mode: "date" | "time";
  value: string;
  onChange: (v: string) => void;
}) {
  const { prefs, colors, dark, t } = useApp();
  const [open, setOpen] = useState(false);
  const date = new Date(
    mode === "date" ? value + "T12:00:00Z" : "2026-01-01T" + value + ":00Z",
  );
  const change = (_: unknown, next: Date) => {
    onChange(
      mode === "date"
        ? next.toISOString().slice(0, 10)
        : next.toISOString().slice(11, 16),
    );
  };
  const props = {
    value: date,
    mode,
    timeZoneName: "UTC",
    is24Hour: prefs.timeFormat === "24h",
    onValueChange: change,
  };
  const display =
    mode === "date"
      ? dayText(value, prefs.language, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Intl.DateTimeFormat(prefs.language === "id" ? "id-ID" : "en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: prefs.timeFormat === "24h" ? "h23" : "h12",
        }).format(date);
  return (
    <View>
      <SelectRow
        label={label}
        value={display}
        icon={mode === "date" ? "calendar-outline" : "time-outline"}
        onPress={() =>
          Platform.OS === "android"
            ? DateTimePickerAndroid.open({
                ...props,
                positiveButton: { label: t("done") },
                negativeButton: { label: t("cancel") },
              })
            : setOpen(!open)
        }
      />
      {open && Platform.OS === "ios" && (
        <View>
          <DateTimePicker
            {...props}
            display="spinner"
            locale={prefs.language === "id" ? "id-ID" : "en-GB"}
            themeVariant={dark ? "dark" : "light"}
            textColor={colors.text}
            accentColor={colors.accent}
            style={{ height: 180 }}
          />
          <Button
            title={t("done")}
            kind="text"
            onPress={() => setOpen(false)}
          />
        </View>
      )}
    </View>
  );
}

import React from "react";
import { Field } from "./ui";
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
  return (
    <Field
      label={label}
      value={value}
      placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:mm"}
      onChangeText={onChange}
      maxLength={mode === "date" ? 10 : 5}
      keyboardType="numbers-and-punctuation"
    />
  );
}

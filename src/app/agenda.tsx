import React from "react";
import { useApp } from "../store";
import { Screen } from "../components/ui";
import { AgendaList } from "../components/schedule";
export default function Agenda() {
  const { t, setOverlay } = useApp();
  return (
    <Screen
      back
      title={t("agenda")}
      action={{
        title: t("makePlan"),
        onPress: () => setOverlay({ kind: "event" }),
      }}
    >
      <AgendaList full />
    </Screen>
  );
}

import React from "react";
import { useApp } from "../store";
import { Screen } from "../components/ui";
import { AgendaList } from "../components/schedule";
import { GroupStart } from "../components/groupStart";
export default function Agenda() {
  const { t, setOverlay, group } = useApp();
  return (
    <Screen
      back
      title={t("agenda")}
      action={
        group
          ? {
              title: t("makePlan"),
              onPress: () => setOverlay({ kind: "event" }),
            }
          : undefined
      }
    >
      {group ? <AgendaList full /> : <GroupStart />}
    </Screen>
  );
}

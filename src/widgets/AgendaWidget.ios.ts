import { requireOptionalNativeModule } from "expo-modules-core";
import type { AgendaWidgetPayload } from "./types";

const hasNativeWidgets = Boolean(requireOptionalNativeModule("ExpoWidgets"));

export async function syncNativeAgendaWidget(
  payload: AgendaWidgetPayload,
): Promise<boolean> {
  if (!hasNativeWidgets) return false;
  // Keep Expo Go usable for UI previews; its binary does not include WidgetKit.
  const { default: agendaWidget } = await import("./AgendaWidgetLayout.ios");
  agendaWidget.updateSnapshot(payload);
  return true;
}

// Apple only allows adding widgets from the home-screen widget gallery.
export async function requestNativeAgendaWidget(): Promise<boolean> {
  return false;
}

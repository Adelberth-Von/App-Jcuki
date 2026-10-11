import type { AgendaWidgetPayload } from "./types";

// Web preview/Expo Go cannot install operating-system widgets.
export async function syncNativeAgendaWidget(
  _payload: AgendaWidgetPayload,
): Promise<boolean> {
  return false;
}

export async function requestNativeAgendaWidget(): Promise<boolean> {
  return false;
}

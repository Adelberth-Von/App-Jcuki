import {
  requestNativeAgendaWidget,
  syncNativeAgendaWidget,
} from "../widgets/AgendaWidget";
import type { AgendaWidgetPayload } from "../widgets/types";

export type { AgendaWidgetPayload } from "../widgets/types";

/** Refreshes the agenda shared with the native home-screen widget. */
export async function syncAgendaWidget(
  payload: AgendaWidgetPayload,
): Promise<boolean> {
  return syncNativeAgendaWidget(payload);
}

/** Android shows the launcher's pin confirmation; iOS returns false for gallery instructions. */
export async function requestAgendaWidget(): Promise<boolean> {
  return requestNativeAgendaWidget();
}

import { requireOptionalNativeModule } from "expo-modules-core";
import type { AgendaWidgetPayload } from "./types";

type WidgetModule = {
  updateAgenda(payload: AgendaWidgetPayload): Promise<boolean>;
  requestPin(): Promise<boolean>;
};

const nativeWidget = requireOptionalNativeModule<WidgetModule>("JCukiWidget");

export async function syncNativeAgendaWidget(
  payload: AgendaWidgetPayload,
): Promise<boolean> {
  return nativeWidget ? nativeWidget.updateAgenda(payload) : false;
}

export async function requestNativeAgendaWidget(): Promise<boolean> {
  return nativeWidget ? nativeWidget.requestPin() : false;
}

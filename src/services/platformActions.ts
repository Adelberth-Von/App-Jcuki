import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";
import { calendarICS } from "../lib/domain";
import type { AppLanguage } from "./preferences";

export type UninstallSettingsResult = "opened" | "manual" | "preview";
const APP_PACKAGE = "com.terrence.jcuki";

/** Open Android's app info page. The user chooses Uninstall and confirms in the OS UI. */
export async function openUninstallSettings(): Promise<UninstallSettingsResult> {
  if (Platform.OS === "web") return "preview";
  if (Platform.OS === "ios") return "manual";
  // Expo Go is a host application; never direct a user toward removing the host itself.
  if (Application.applicationId !== APP_PACKAGE) return "preview";
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
      {
        data: `package:${Application.applicationId}`,
      },
    );
  } catch {
    await Linking.openSettings();
  }
  return "opened";
}

export function uninstallInstructions(
  language: AppLanguage,
  platform = Platform.OS,
): string {
  if (platform === "ios")
    return language === "id"
      ? "Di layar utama iPhone, tekan dan tahan ikon JCuki, pilih Hapus App, lalu Hapus App sekali lagi untuk mengonfirmasi."
      : "On your iPhone Home Screen, touch and hold JCuki, choose Remove App, then Delete App to confirm.";
  if (platform === "android")
    return language === "id"
      ? "Di halaman info aplikasi JCuki, pilih Uninstall lalu konfirmasi. Kamu juga bisa menekan dan menahan ikon JCuki di layar utama."
      : "In JCuki app info, choose Uninstall and confirm. You can also touch and hold the JCuki icon on your Home Screen.";
  return language === "id"
    ? "Tombol ini tersedia dalam aplikasi JCuki yang terpasang di ponsel. Preview browser dapat ditutup seperti tab biasa."
    : "This action is available in JCuki installed on your phone. Close this browser preview like any other tab.";
}

export interface CalendarExportResult {
  uri: string;
  method: "shared" | "downloaded" | "unavailable";
}

/** Create an .ics and open the system share sheet. This exports a file; importing remains a user choice. */
export async function exportCalendarFile(
  icsText: string,
  filename = "jcuki-agenda.ics",
  language: AppLanguage = "en",
): Promise<CalendarExportResult> {
  if (
    !icsText.startsWith("BEGIN:VCALENDAR\r\n") ||
    !icsText.includes("\r\nEND:VCALENDAR")
  )
    throw new Error("INVALID_CALENDAR_FILE");
  const safeName =
    filename
      .replace(/\.ics$/i, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 60) || "jcuki-agenda";
  if (Platform.OS === "web") {
    const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
    const uri = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = uri;
    anchor.download = `${safeName}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(uri), 30000);
    return { uri, method: "downloaded" };
  }
  const directory = new Directory(Paths.cache, "jcuki-exports");
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, `${safeName}.ics`);
  file.create({ overwrite: true });
  file.write(icsText);
  if (!(await Sharing.isAvailableAsync()))
    return { uri: file.uri, method: "unavailable" };
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/calendar",
    UTI: "com.apple.ical.ics",
    dialogTitle:
      language === "id" ? "Tambahkan ke kalender" : "Add to calendar",
  });
  return { uri: file.uri, method: "shared" };
}

export function shareCalendarEvent(
  event: Parameters<typeof calendarICS>[0],
  language: AppLanguage = "en",
): Promise<CalendarExportResult> {
  return exportCalendarFile(calendarICS(event), "jcuki-agenda.ics", language);
}

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
globalThis.__jcukiCalendar = {
  timeZone: "Asia/Jakarta",
  uses24hourClock: true,
};
const modules = {
  "expo-localization":
    'export function getCalendars(){return [globalThis.__jcukiCalendar]} export function getLocales(){return [{languageCode:"id"}]}',
  "@react-native-async-storage/async-storage":
    "export default {getItem:async()=>null,setItem:async()=>{}}",
};
const hooks = registerHooks({
  resolve(name, ctx, next) {
    return Object.hasOwn(modules, name)
      ? { url: "jcuki-pref:" + name, shortCircuit: true }
      : next(name, ctx);
  },
  load(url, ctx, next) {
    return url.startsWith("jcuki-pref:")
      ? { format: "module", source: modules[url.slice(11)], shortCircuit: true }
      : next(url, ctx);
  },
});
const prefs = await import("../src/services/preferences.ts");
after(() => {
  hooks.deregister();
  delete globalThis.__jcukiCalendar;
});
test("automatic time zone uses the current device, including a change of country", () => {
  assert.equal(prefs.getDefaultPreferences().timeZone, "auto");
  assert.equal(prefs.getDeviceTimeZone(), "Asia/Jakarta");
  globalThis.__jcukiCalendar.timeZone = "Europe/Berlin";
  assert.equal(
    prefs.getEffectiveTimeZone({ timeZone: "auto" }),
    "Europe/Berlin",
  );
  globalThis.__jcukiCalendar.timeZone = "Australia/Adelaide";
  assert.equal(
    prefs.getEffectiveTimeZone({ timeZone: "auto" }),
    "Australia/Adelaide",
  );
});
test("legacy manual zone migrates to automatic without losing appearance or language", () => {
  const next = prefs.normalizePreferences({
    timeZone: "Asia/Jakarta",
    theme: "dark",
    language: "en",
  });
  assert.equal(next.timeZone, "auto");
  assert.equal(next.theme, "dark");
  assert.equal(next.language, "en");
});
test("an invalid OS calendar zone falls back to the device Intl zone", () => {
  globalThis.__jcukiCalendar.timeZone = "not/a-zone";
  assert.equal(
    prefs.getDeviceTimeZone(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
});

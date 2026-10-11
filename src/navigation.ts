import { router } from "expo-router";
/** Deep links can enter a screen without a preceding native navigation entry. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

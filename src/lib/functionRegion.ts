/** Keep DB round trips in the project's region; callers still use their own local time zone. */
export function withFunctionRegion(address: string): string {
  const url = new URL(address);
  if (!url.pathname.startsWith("/functions/v1/")) return address;
  const configured = process.env.EXPO_PUBLIC_FUNCTION_REGION?.trim();
  if (configured === "auto") return address;
  const region =
    configured ||
    (url.hostname === "chzyuktjcyrpbdwvdgsc.supabase.co"
      ? "ap-northeast-1"
      : "");
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) return address;
  // The gateway query option also works on web without adding a CORS preflight header.
  url.searchParams.set("forceFunctionRegion", region);
  return url.href;
}

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  "https://chzyuktjcyrpbdwvdgsc.supabase.co";
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/jcuki`;
// Publishable client key. Database privileges are enforced on the server.
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_LbVP2ySzaFJKqiGEAsLLTg_7-XDPr3M";

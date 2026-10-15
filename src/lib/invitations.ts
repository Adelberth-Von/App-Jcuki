/** Invitations never contain device credentials or accept arbitrary server URLs. */
export function invitationLink(code: string): string {
  return `jcuki://join?code=${encodeURIComponent(code)}`;
}
export function invitationCode(input: string): string {
  const text = input.trim();
  let code = text;
  if (text.includes("://")) {
    try {
      const url = new URL(text);
      if (url.protocol !== "jcuki:" || url.hostname !== "join") return "";
      code = url.searchParams.get("code") || "";
    } catch {
      return "";
    }
  }
  code = code.toUpperCase().replace(/[\s-]/g, "");
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/.test(code) ? code : "";
}

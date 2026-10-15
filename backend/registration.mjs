export function registrationInput(body) {
  const text = (value, min, max) =>
    typeof value === "string" &&
    value.trim().length >= min &&
    value.trim().length <= max &&
    !/[\u0000-\u001f]/.test(value);
  if (!text(body.fullName, 2, 80)) return { error: "INVALID_FULL_NAME" };
  if (!text(body.nickname, 2, 24)) return { error: "INVALID_NICKNAME" };
  if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  )
    return { error: "EMAIL_INVALID" };
  if (
    typeof body.password !== "string" ||
    body.password.length < 8 ||
    body.password.length > 128
  )
    return { error: "PASSWORD_WEAK" };
  if (body.password !== body.confirmPassword)
    return { error: "PASSWORD_MISMATCH" };
  let zone = typeof body.zone === "string" ? body.zone : "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
  } catch {
    zone = "UTC";
  }
  return {
    email: body.email.trim().toLowerCase(),
    password: body.password,
    user_metadata: {
      full_name: body.fullName.trim(),
      nickname: body.nickname.trim(),
      zone,
    },
    email_confirm: true,
  };
}

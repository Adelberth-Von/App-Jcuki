export type AccountFields = {
  fullName: string;
  nickname: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export function validateAccount(fields: AccountFields, register: boolean) {
  const errors: Partial<Record<keyof AccountFields, string>> = {};
  if (
    register &&
    (fields.fullName.trim().length < 2 ||
      fields.fullName.trim().length > 80 ||
      /[\u0000-\u001f]/.test(fields.fullName))
  )
    errors.fullName = "authFullNameInvalid";
  if (
    register &&
    (fields.nickname.trim().length < 2 ||
      fields.nickname.trim().length > 24 ||
      /[\u0000-\u001f]/.test(fields.nickname))
  )
    errors.nickname = "invalidNickname";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) ||
    fields.email.trim().length > 254
  )
    errors.email = "authEmailInvalid";
  if (!fields.password || (register && fields.password.length < 8))
    errors.password = register ? "authPasswordShort" : "authPasswordRequired";
  if (register && fields.confirmPassword !== fields.password)
    errors.confirmPassword = "authPasswordMismatch";
  return errors;
}
export function accountError(error: unknown) {
  const value = error as { code?: string; message?: string; status?: number };
  const code = value?.code || "";
  if (code === "ACCOUNT_CREATED_LOGIN_FAILED") return "authCreatedLoginFailed";
  if (code === "INVALID_FULL_NAME") return "authFullNameInvalid";
  if (code === "INVALID_NICKNAME") return "invalidNickname";
  if (code === "EMAIL_INVALID") return "authEmailInvalid";
  if (code === "EMAIL_EXISTS") return "authEmailExists";
  if (code === "PASSWORD_WEAK") return "authPasswordShort";
  if (code === "PASSWORD_MISMATCH") return "authPasswordMismatch";
  if (code === "RATE_LIMITED") return "authRateLimited";
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    code === "invalid_login_credentials"
  )
    return "authWrongCredentials";
  if (code === "email_not_confirmed") return "authEmailUnconfirmed";
  if (code === "user_already_exists" || code === "email_exists")
    return "authEmailExists";
  if (code === "weak_password") return "authPasswordShort";
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    value?.status === 429
  )
    return "authRateLimited";
  if (code === "email_address_invalid" || code === "validation_failed")
    return "authEmailInvalid";
  if (
    code === "email_address_not_authorized" ||
    /email.*not authorized/i.test(value?.message || "")
  )
    return "authEmailDelivery";
  if (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    code === "bad_code_verifier"
  )
    return "authLinkExpired";
  if (!value?.status || /fetch|network|timeout/i.test(value?.message || ""))
    return "authNetworkError";
  return "authTryAgain";
}

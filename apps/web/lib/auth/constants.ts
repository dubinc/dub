export const PASSWORD_RESET_TOKEN_EXPIRY = 1 * 60 * 60; // 1 hour

export const MAX_LOGIN_ATTEMPTS = 10;

export const EMAIL_OTP_EXPIRY_IN = 2 * 60; // 2 minutes

export const FRAMER_API_HOST =
  process.env.NODE_ENV === "production"
    ? "https://api.framer.com"
    : "https://api.development.framer.com";

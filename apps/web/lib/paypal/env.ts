const isLive = process.env.NODE_ENV === "production";

export const paypalEnv = {
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || "",
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || "",
  PAYPAL_AUTHORIZE_HOST: isLive
    ? "https://www.paypal.com"
    : "https://www.sandbox.paypal.com",
  PAYPAL_API_HOST: isLive
    ? "https://api.paypal.com"
    : "https://api-m.sandbox.paypal.com",
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || "",
};

// server routes
export enum EServerRoutes {
  USER = "user-session",

  USER_SESSION = "checkout/session",
  USER_PAYMENT = "checkout/payment",

  USER_SUBSCRIPTION = "checkout/subscription",
  USER_SUBSCRIPTION_UPDATE = "checkout/subscription/update",
  USER_SUBSCRIPTION_STATUS = "checkout/subscription/status",
  USER_SUBSCRIPTION_PAYMENT_METHOD_UPDATE = "checkout/subscription/payment-method/update",

  OTP_CODE_SEND = "checkout/subscription/otp-code/send-confirm",
  OTP_CODE_VERIFY = "checkout/subscription/otp-code/verify",
}

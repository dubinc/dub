import * as OTPAuth from "otpauth";

export const totp = new OTPAuth.TOTP({
  issuer: "Dub",
  label: "Alice",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
  secret: "US3WHSG7X5KAPV27VANWKQHF3SH3HULL", // TODO: Replace this and read from env
});

export const totpSecret = new OTPAuth.Secret({
  size: 32,
});

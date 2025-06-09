import * as OTPAuth from "otpauth";

const options = {
  issuer: "Dub",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
};

export const totpSecret = new OTPAuth.Secret({
  size: 20, // 160 bits = 32 characters
});

export const generateTOTPQRCode = ({
  secret,
  label,
}: {
  secret: string;
  label: string;
}) => {
  const totp = new OTPAuth.TOTP({
    ...options,
    secret,
    label,
  });

  return totp.toString();
};

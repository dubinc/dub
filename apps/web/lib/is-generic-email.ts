export const GENERIC_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "me.com",
  "msn.com",
  "live.com",
  "protonmail.com",
];

export const isGenericEmail = (email: string) => {
  return GENERIC_EMAIL_DOMAINS.some((domain) => email.endsWith(`@${domain}`));
};

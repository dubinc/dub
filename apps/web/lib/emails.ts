export const genericEmailDomains = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
  "qq.com",
  "proton.me",
  "emaily.pro",
  "duck.com",
  "protonmail.com",
  "googlemail.com",
  "pm.me",
  "me.com",
  "live.com",
  "mail.ru",
  "hey.com",
  "aol.com",
  "comcast.net",
];

export const isGenericEmail = (email: string) => {
  return genericEmailDomains.some((domain) => email.endsWith(`@${domain}`));
};

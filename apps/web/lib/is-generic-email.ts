import { extractEmailDomain } from "./email/extract-email-domain";

const GENERIC_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "ymail.com",
  "icloud.com",
  "aol.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "me.com",
  "mac.com",
  "msn.com",
  "live.com",
  "web.de",
  "protonmail.com",
  "proton.me",
  "passinbox.com",
  "163.com",
  "duck.com",
  "qq.com",
  "zoho.com",
  "fastmail.com",
  "tutanota.com",
  "tuta.com",
  "privaterelay.appleid.com",
  "qyver.online",
  "naver.com",
  "yeah.net",
  "example.com",
  "mail.com",
  "mail.ru",
];

const GENERIC_EMAIL_DOMAIN_PREFIXES = [
  "yahoo.",
  "hotmail.",
  "outlook.",
  "gmx.",
  "yandex.",
];

export const isGenericEmail = (email: string) => {
  const emailDomain = extractEmailDomain(email);
  if (!emailDomain) {
    return false;
  }

  return (
    GENERIC_EMAIL_DOMAINS.includes(emailDomain) ||
    GENERIC_EMAIL_DOMAIN_PREFIXES.some((prefix) =>
      emailDomain.startsWith(prefix),
    )
  );
};

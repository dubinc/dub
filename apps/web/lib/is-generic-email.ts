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
  "msn.com",
  "web.de",
  "atomicmail.io",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "passinbox.com",
  "passmail.net",
  "163.com",
  "126.com",
  "duck.com",
  "qq.com",
  "zoho.com",
  "fastmail.com",
  "tutanota.com",
  "tuta.com",
  "privaterelay.appleid.com",
  "qyver.online",
  "vk.com",
  "tutamail.com",
  "simplelogin.com",
  "volny.cz",
  "naver.com",
  "yeah.net",
  "example.com",
  "wp.pl",
  "seznam.cz",
  "myyahoo.com",
  "mail.com",
  "mail.ru",
  "email.cz",
  "email.de",
  "t-online.de",
  "sina.com",
  "foxmail.com",
  "ukr.net",
  "otona.uk",
  "instaddr.ch",
];

const GENERIC_EMAIL_DOMAIN_PREFIXES = [
  "yahoo.",
  "hotmail.",
  "outlook.",
  "gmx.",
  "yandex.",
  "live.",
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

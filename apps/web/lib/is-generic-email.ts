import { extractEmailDomain } from "./email/extract-email-domain";

const GENERIC_EMAIL_DOMAINS = [
  "googlemail.com",
  "ymail.com",
  "icloud.com",
  "aol.com",
  "comcast.net",
  "sbcglobal.net",
  "verizon.net",
  "att.net",
  "cox.net",
  "me.com",
  "msn.com",
  "web.de",
  "atomicmail.io",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "promail.ink",
  "passinbox.com",
  "163.com",
  "126.com",
  "duck.com",
  "qq.com",
  "zoho.com",
  "fastmail.com",
  "tutanota.com",
  "tuta.com",
  "mac.com",
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
  "t-mail.asia",
  "adras.org",
  "emailinbo.live",
  "kw.com",
  "bluewin.ch",
  "web-library.net",
  "8shield.net",
  "tormails.com",
  "sugtbt.com",
  "kakao.com",
  "luxudata.com",
  "homephit.com",
  "fexpost.com",
  "rambler.ru",
  "charter.net",
  "mailbox.in.ua",
  "hi2.in",
  "tempmailplus.net",
];

const GENERIC_EMAIL_DOMAIN_PREFIXES = [
  "yahoo.",
  "hotmail.",
  "outlook.",
  "gmx.",
  "yandex.",
  "live.",
  "student.",
  "passmail.",
  "gmail.",
  "fexbox.",
];

const GENERIC_EMAIL_DOMAIN_SUFFIXES = [
  ".edu.pl",
  ".edu.rs",
  ".top",
  ".cfd",
  ".cyou",
  ".icu",
  ".xxx",
  ".sbs",
  ".click",
  ".digital",
  ".pro",
  ".lol",
  ".monster",
  ".buzz",
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
    ) ||
    GENERIC_EMAIL_DOMAIN_SUFFIXES.some((suffix) => emailDomain.endsWith(suffix))
  );
};

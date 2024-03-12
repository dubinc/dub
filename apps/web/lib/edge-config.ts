import { getDomainWithoutWWW } from "@dub/utils";
import { get } from "@vercel/edge-config";

export const isBlacklistedDomain = async (domain: string) => {
  let blacklistedDomains, blacklistedTerms;
  try {
    [blacklistedDomains, blacklistedTerms] = await Promise.all([
      get("domains"),
      get("terms"),
    ]);
  } catch (e) {
    return false; // if blacklisted domains & terms don't exist, don't block
  }

  const domainToTest = getDomainWithoutWWW(domain) || domain;

  const blacklistedTermsRegex = new RegExp(
    blacklistedTerms
      .map((term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
  );
  return (
    blacklistedDomains.includes(domainToTest) ||
    blacklistedTermsRegex.test(domainToTest)
  );
};

export const isBlacklistedReferrer = async (referrer: string | null) => {
  const hostname = referrer ? getDomainWithoutWWW(referrer) : "(direct)";
  let referrers;
  try {
    referrers = await get("referrers");
  } catch (e) {
    referrers = [];
  }
  return !referrers.includes(hostname);
};

export const isBlacklistedKey = async (key: string) => {
  let blacklistedKeys;
  try {
    blacklistedKeys = await get("keys");
  } catch (e) {
    blacklistedKeys = [];
  }
  if (blacklistedKeys.length === 0) return false;
  return new RegExp(blacklistedKeys.join("|"), "i").test(key);
};

export const isWhitelistedEmail = async (email: string) => {
  let whitelistedEmails;
  try {
    whitelistedEmails = await get("whitelist");
  } catch (e) {
    whitelistedEmails = [];
  }
  return whitelistedEmails.includes(email);
};

export const isBlacklistedEmail = async (email: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB) {
    return false;
  }
  let blacklistedEmails;
  try {
    blacklistedEmails = await get("emails");
  } catch (e) {
    blacklistedEmails = [];
  }
  if (blacklistedEmails.length === 0) return false;
  return new RegExp(blacklistedEmails.join("|"), "i").test(email);
};

export const isReservedKey = async (key: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB) {
    return false;
  }
  let reservedKeys;
  try {
    reservedKeys = await get("reserved");
  } catch (e) {
    reservedKeys = [];
  }
  return reservedKeys.includes(key.toLowerCase());
};

export const isReservedUsername = async (key: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB) {
    return false;
  }
  let reservedUsernames;
  try {
    reservedUsernames = await get("reservedUsernames");
  } catch (e) {
    reservedUsernames = [];
  }
  return reservedUsernames.includes(key.toLowerCase());
};

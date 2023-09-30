import { get } from "@vercel/edge-config";
import { getDomainWithoutWWW } from "./utils";

export const isBlacklistedDomain = async (domain: string) => {
  let blacklistedDomains, blacklistedTerms;
  try {
    [blacklistedDomains, blacklistedTerms] = await Promise.all([
      get("domains"),
      get("terms"),
    ]);
  } catch (e) {
    return false;
  }
  const domainToTest = getDomainWithoutWWW(domain) || domain;
  return (
    blacklistedDomains.includes(domainToTest) ||
    new RegExp(blacklistedTerms.join("|")).test(domainToTest)
  );
};

export const isBlacklistedReferrer = async (referrer: string | null) => {
  const hostname = referrer ? getDomainWithoutWWW(referrer) : "(direct)";
  let referrers;
  try {
    referrers = await get("referrers");
  } catch (e) {
    return false;
  }
  return !referrers.includes(hostname);
};

export const isBlacklistedKey = async (key: string) => {
  let blacklistedKeys;
  try {
    blacklistedKeys = await get("keys");
  } catch (e) {
    return false;
  }
  return new RegExp(blacklistedKeys.join("|"), "i").test(key);
};

export const isWhitelistedEmail = async (email: string) => {
  let whitelistedEmails;
  try {
    whitelistedEmails = await get("whitelist");
  } catch (e) {
    return false;
  }
  return whitelistedEmails.includes(email);
};

export const isBlacklistedEmail = async (email: string) => {
  let blacklistedEmails;
  try {
    blacklistedEmails = await get("emails");
  } catch (e) {
    return false;
  }

  return new RegExp(blacklistedEmails.join("|"), "i").test(email);
};

export const isReservedKey = async (key: string) => {
  let reservedKey;
  if (!process.env.EDGE_CONFIG) {
    // If EDGE_CONFIG is not set, these are the default reserved keys
    reservedKey = [
      "blog",
      "help",
      "pricing",
      "changelog",
      "metatags",
      "terms",
      "privacy",
    ];
  }
  try {
    reservedKey = await get("reserved");
  } catch (e) {
    return false;
  }
  return reservedKey.includes(key);
};

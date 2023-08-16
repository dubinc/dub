import { get } from "@vercel/edge-config";
import { getDomainWithoutWWW } from "./utils";

export const isBlacklistedDomain = async (domain: string) => {
  let blacklistedDomains;
  try {
    blacklistedDomains = await get("domains");
  } catch (e) {
    blacklistedDomains = [];
  }
  return new RegExp(blacklistedDomains.join("|")).test(
    getDomainWithoutWWW(domain) || domain,
  );
};

export const isBlacklistedReferrer = async (referrer: string) => {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(referrer)) {
    return true;
  }
  let blacklistedReferrers;
  try {
    blacklistedReferrers = await get("referrers");
  } catch (e) {
    blacklistedReferrers = [];
  }
  return new RegExp(blacklistedReferrers.join("|"), "i").test(referrer);
};

export const isBlacklistedKey = async (key: string) => {
  let blacklistedKeys;
  try {
    blacklistedKeys = await get("keys");
  } catch (e) {
    blacklistedKeys = [];
  }
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
  let blacklistedEmails;
  try {
    blacklistedEmails = await get("emails");
  } catch (e) {
    blacklistedEmails = [];
  }
  return new RegExp(blacklistedEmails.join("|"), "i").test(email);
};

export const isReservedKey = async (key: string) => {
  if (!process.env.EDGE_CONFIG) {
    // If EDGE_CONFIG is not set, these are the default reserved keys
    return [
      "blog",
      "help",
      "pricing",
      "changelog",
      "metatags",
      "terms",
      "privacy",
    ];
  }
  let reservedKey;
  try {
    reservedKey = await get("reserved");
  } catch (e) {
    reservedKey = [];
  }
  return reservedKey.includes(key);
};

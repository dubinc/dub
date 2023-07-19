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
  return new Set(whitelistedEmails).has(email);
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
  let reservedKey;
  try {
    reservedKey = await get("reserved");
  } catch (e) {
    reservedKey = [];
  }
  return new Set(reservedKey).has(key);
};

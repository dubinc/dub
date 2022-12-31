import { NextRouter } from "next/router";
import ms from "ms";
import { customAlphabet } from "nanoid";
import {
  SPECIAL_APEX_DOMAINS,
  ccTLDs,
  SECOND_LEVEL_DOMAINS,
} from "./constants";
import { createClient } from "@vercel/edge-config";

export const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
); // 7-character random string

interface SWRError extends Error {
  status: number;
}

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<JSON> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const json = await res.json();
    if (json.error) {
      const error = new Error(json.error) as SWRError;
      error.status = res.status;
      throw error;
    } else {
      throw new Error("An unexpected error occurred");
    }
  }

  return res.json();
}

export function nFormatter(num: number, digits?: number) {
  if (!num) return "0";
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(digits || 1).replace(rx, "$1") + item.symbol
    : "0";
}

export function capitalize(str: string) {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function linkConstructor({
  key,
  domain = "dub.sh",
  localhost,
  pretty,
  noDomain,
}: {
  key: string;
  domain?: string;
  localhost?: boolean;
  pretty?: boolean;
  noDomain?: boolean;
}) {
  const link = `${localhost ? "http://localhost:3000" : `https://${domain}`}${
    key !== "_root" ? `/${key}` : ""
  }`;

  if (noDomain) return `/${key}`;
  return pretty ? link.replace(/^https?:\/\//, "") : link;
}

export const timeAgo = (timestamp: Date, timeOnly?: boolean): string => {
  if (!timestamp) return "never";
  return `${ms(Date.now() - new Date(timestamp).getTime())}${
    timeOnly ? "" : " ago"
  }`;
};

export const getDateTimeLocal = (timestamp?: Date): string => {
  const d = timestamp ? new Date(timestamp) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split(":")
    .slice(0, 2)
    .join(":");
};

export const getFirstAndLastDay = (day: number) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  if (currentDay >= day) {
    // if the current day is greater than target day, it means that we just passed it
    return {
      firstDay: new Date(currentYear, currentMonth, day),
      lastDay: new Date(currentYear, currentMonth + 1, day - 1),
    };
  } else {
    // if the current day is less than target day, it means that we haven't passed it yet
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear; // if the current month is January, we need to go back a year
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // if the current month is January, we need to go back to December
    return {
      firstDay: new Date(lastYear, lastMonth, day),
      lastDay: new Date(currentYear, currentMonth, day - 1),
    };
  }
};

export const generateDomainFromName = (name: string) => {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[\W_]+/g, "");
  if (normalizedName.length < 3) {
    return "";
  }
  if (ccTLDs.has(normalizedName.slice(-2))) {
    return `${normalizedName.slice(0, -2)}.${normalizedName.slice(-2)}`;
  }
  // remove vowels
  const devowel = normalizedName.replace(/[aeiou]/g, "");
  if (devowel.length >= 3 && ccTLDs.has(devowel.slice(-2))) {
    return `${devowel.slice(0, -2)}.${devowel.slice(-2)}`;
  }

  const shortestString = [normalizedName, devowel].reduce((a, b) =>
    a.length < b.length ? a : b,
  );

  return `${shortestString}.to`;
};

export const validDomainRegex = new RegExp(
  "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$",
);

export const getSubdomain = (name: string, apexName: string) => {
  if (name === apexName) return null;
  return name.slice(0, name.length - apexName.length - 1);
};

export const getApexDomain = (url: string) => {
  let domain;
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    return "";
  }
  // special apex domains (e.g. youtu.be)
  if (SPECIAL_APEX_DOMAINS[domain]) return SPECIAL_APEX_DOMAINS[domain];

  const parts = domain.split(".");
  if (parts.length > 2) {
    // if this is a second-level TLD (e.g. co.uk, .com.ua, .org.tt), we need to return the last 3 parts
    if (
      SECOND_LEVEL_DOMAINS.has(parts[parts.length - 2]) &&
      ccTLDs.has(parts[parts.length - 1])
    ) {
      return parts.slice(-3).join(".");
    }
    // otherwise, it's a subdomain (e.g. dub.vercel.app), so we return the last 2 parts
    return parts.slice(-2).join(".");
  }
  // if it's a normal domain (e.g. dub.sh), we return the domain
  return domain;
};

export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const getUrlFromString = (str: string) => {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes(".") && !str.includes(" ")) {
      return new URL(`https://${str}`).toString();
    }
  } catch (e) {
    return null;
  }
};

export const getDomainWithoutWWW = (url: string) => {
  if (isValidUrl(url)) {
    return new URL(url).hostname.replace(/^www\./, "");
  }
  try {
    if (url.includes(".") && !url.includes(" ")) {
      return new URL(`https://${url}`).hostname.replace(/^www\./, "");
    }
  } catch (e) {
    return null;
  }
};

export const getQueryString = (router: NextRouter) => {
  const { slug: omit, ...queryWithoutSlug } = router.query as {
    slug: string;
    [key: string]: string;
  };
  const queryString = new URLSearchParams(queryWithoutSlug).toString();
  return `${queryString ? "?" : ""}${queryString}`;
};

export const truncate = (str: string, length: number) => {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length)}...`;
};

export const getParamsFromURL = (url: string) => {
  if (!url) return {};
  try {
    const params = new URL(url).searchParams;
    const paramsObj: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      if (value && value !== "") {
        paramsObj[key] = value;
      }
    }
    return paramsObj;
  } catch (e) {
    return {};
  }
};

export const constructURLFromUTMParams = (
  url: string,
  utmParams: Record<string, string>,
) => {
  if (!url) return "";
  try {
    const newURL = new URL(url);
    for (const [key, value] of Object.entries(utmParams)) {
      if (value === "") {
        newURL.searchParams.delete(key);
      } else {
        newURL.searchParams.set(key, value);
      }
    }
    return newURL.toString();
  } catch (e) {
    return "";
  }
};

export const paramsMetadata = [
  { display: "UTM Source", key: "utm_source", examples: "twitter, facebook" },
  { display: "UTM Medium", key: "utm_medium", examples: "social, email" },
  { display: "UTM Campaign", key: "utm_campaign", examples: "summer_sale" },
  { display: "UTM Term", key: "utm_term", examples: "blue_shoes" },
  { display: "UTM Content", key: "utm_content", examples: "logolink" },
];

export const getUrlWithoutUTMParams = (url: string) => {
  try {
    const newURL = new URL(url);
    paramsMetadata.forEach((param) => newURL.searchParams.delete(param.key));
    return newURL.toString();
  } catch (e) {
    return url;
  }
};

const logTypeToEnv = {
  cron: process.env.DUB_SLACK_HOOK_CRON,
  links: process.env.DUB_SLACK_HOOK_LINKS,
};

export const log = async (message: string, type: "cron" | "links") => {
  /* Log a message to the console */
  const HOOK = logTypeToEnv[type];
  if (!HOOK) return;
  try {
    return await fetch(HOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message,
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.log(`Failed to log to Dub Slack. Error: ${e}`);
  }
};

export const edgeConfig = createClient(
  `https://edge-config.vercel.com/ecfg_eh6zdvznm70adch6q0mqxshrt4ny?token=64aef40c-ea06-4aeb-b528-b94d924ec05a`,
);

export const getBlackListedDomains = async () => {
  try {
    const domains = await edgeConfig.get("domains");
    return domains || [];
  } catch (e) {
    return [];
  }
};

export const isBlacklistedDomain = async (domain: string) => {
  const blacklistedDomains = await getBlackListedDomains();
  return new RegExp(blacklistedDomains.join("|")).test(
    getDomainWithoutWWW(domain),
  );
};

export const getBlackListedEmails = async () => {
  try {
    const emails = await edgeConfig.get("emails");
    if (emails) {
      return new Set(emails);
    } else {
      return new Set();
    }
  } catch (e) {
    return new Set();
  }
};

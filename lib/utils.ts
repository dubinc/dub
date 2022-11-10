import { NextRouter } from "next/router";
import ms from "ms";
import { customAlphabet } from "nanoid";
import {
  SPECIAL_APEX_DOMAINS,
  ccTLDs,
  SECOND_LEVEL_DOMAINS,
} from "./constants";

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
  const link = `${
    localhost ? "http://localhost:3000" : `https://${domain}`
  }/${key}`;

  if (noDomain) return `/${key}`;
  return pretty ? link.replace(/^https?:\/\//, "") : link;
}

export const getTitleFromUrl = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // timeout if it takes longer than 2 seconds
  const title = await fetch(url, { signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      return res.text();
    })
    .then((body: string) => {
      let match = body.match(/<title>([^<]*)<\/title>/); // regular expression to parse contents of the <title> tag
      if (!match || typeof match[1] !== "string") return "No title found"; // if no title found, return "No title found"
      return match[1];
    })
    .catch((err) => {
      console.log(err);
      return "No title found"; // if there's an error, return "No title found"
    });
  return title;
};

export const getDescriptionFromUrl = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // timeout if it takes longer than 2 seconds
  const description = await fetch(url, { signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      return res.text();
    })
    .then((body: string) => {
      let match = body.match(/<meta name="description" content="(.*?)"\/>/g); // regular expression to parse contents of the description meta tag
      if (!match || typeof match[0] !== "string") return "No description found"; // if no title found, return "No title found"
      let description = match[0].match(/content="(.*)"\/>/).pop();
      if (!description) return "No description found";
      return description;
    })
    .catch((err) => {
      console.log(err);
      return "No description found"; // if there's an error, return "No title found"
    });
  return description;
};

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

export const generateSlugFromName = (name: string) => {
  const normalizedName = name.toLowerCase().replaceAll(" ", "-");
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

  const acronym = normalizedName
    .split("-")
    .map((word) => word[0])
    .join("");

  if (acronym.length >= 3 && ccTLDs.has(acronym.slice(-2))) {
    return `${acronym.slice(0, -2)}.${acronym.slice(-2)}`;
  }

  const shortestString = [normalizedName, devowel, acronym].reduce((a, b) =>
    a.length < b.length ? a : b,
  );

  return `${shortestString}.sh`;
};

export const validDomainRegex = new RegExp(
  "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$",
);

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

export const getDomainWithoutWWW = (url: string) => {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    return "";
  }
  return hostname.replace(/^www\./, "");
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
    const params = new URL(url).searchParams;
    for (const [key, value] of Object.entries(utmParams)) {
      if (value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return `${url.split("?")[0]}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
  } catch (e) {
    return "";
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
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
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
    console.log(`Failed to log to Vercel Slack. Error: ${e}`);
  }
};

export const getBlackListedDomains = async () => {
  const res = await fetch(
    `https://edge-config.vercel.com/ecfg_2yhwl7yp0dcf60nn1cdid4a5xlsa?token=2482c0cb-1101-4e4b-8538-0f54cc43469e`,
  );
  const data = await res.json();
  if (data.domains) {
    return new Set(data.domains);
  } else {
    return new Set();
  }
};

export const getBlackListedEmails = async () => {
  const res = await fetch(
    `https://edge-config.vercel.com/ecfg_yugfr9n59gbwswp2lcdfbxrxfjir?token=5b797399-6c91-4f93-a75c-58d8d7cea3d1`,
  );
  const data = await res.json();
  if (data.emails) {
    return new Set(data.emails);
  } else {
    return new Set();
  }
};

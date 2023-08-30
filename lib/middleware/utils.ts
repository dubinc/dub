import { NextRequest } from "next/server";
import { redis } from "#/lib/upstash";

export const parse = (req: NextRequest) => {
  let domain = req.headers.get("host") as string;
  domain = domain.replace("www.", ""); // remove www. from domain
  if (domain === "dub.localhost:8888" || domain === "staging.dub.sh") {
    // for local development & staging environments
    domain = "dub.sh";
  }

  // path is the path of the URL (e.g. dub.co/stats/github -> /stats/github)
  const path = req.nextUrl.pathname;

  // fullPath is the full URL path (along with search params)
  const searchParams = req.nextUrl.searchParams.toString();
  const fullPath = `${req.nextUrl.pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  // Here, we are using decodeURIComponent to handle foreign languages like Hebrew
  const key = decodeURIComponent(path.split("/")[1]); // key is the first part of the path (e.g. dub.co/stats/github -> stats)
  const fullKey = decodeURIComponent(path.slice(1)); // fullKey is the full path without the first slash (to account for multi-level subpaths, e.g. dub.sh/github/repo -> github/repo)

  return { domain, path, fullPath, key, fullKey };
};

export const getFinalUrl = (target: string, { req }: { req: NextRequest }) => {
  // query is the query string (e.g. dub.sh/github/repo?utm_source=twitter -> ?utm_source=twitter)
  const searchParams = req.nextUrl.searchParams;

  // get the query params of the target url
  const targetUrl = new URL(decodeURIComponent(target));

  // if searchParams (type: `URLSearchParams`) has the same key as target url, then overwrite it
  for (const [key, value] of searchParams) {
    targetUrl.searchParams.set(key, value);
  }

  // construct final url
  const finalUrl = targetUrl.toString();

  return finalUrl;
};

export const detectBot = (req: NextRequest) => {
  const url = req.nextUrl;
  if (url.searchParams.get("bot")) return true;
  const ua = req.headers.get("User-Agent");
  if (ua) {
    /* Note:
     * - bot is for most bots & crawlers
     * - ChatGPT is for ChatGPT
     * - facebookexternalhit is for Facebook crawler
     * - WhatsApp is for WhatsApp crawler
     * - MetaInspector is for https://metatags.io/
     */
    return /bot|chatgpt|facebookexternalhit|WhatsApp|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|MetaInspector/i.test(
      ua,
    );
  }
  return false;
};

// check if a URL has a `X-Frame-Options` header (and caches it in Redis)
export const hasXFrameOptions = async (url: string) => {
  const cachedResults = await redis.get(`x-frame-options:${url}`);
  if (cachedResults) {
    return cachedResults === "yes";
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "dub-bot/1.0",
    },
  });
  const xFrameOptions = res.headers.get("X-Frame-Options"); // returns null if there is no `X-Frame-Options` header
  // cache for 1 month
  await redis.set(`x-frame-options:${url}`, xFrameOptions ? "yes" : "no", {
    ex: 60 * 60 * 24 * 30,
  });

  return xFrameOptions;
};

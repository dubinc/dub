import { NextRequest } from "next/server";
import { isHomeHostname } from "../utils";

export const parse = (req: NextRequest) => {
  let domain = req.headers.get("host") as string;
  domain = domain.replace("www.", ""); // remove www. from domain
  if (isHomeHostname(domain)) domain = "dub.sh"; // if domain is a home hostname, set it to dub.sh

  // path is the path of the URL (e.g. dub.sh/stats/github -> /stats/github)
  const path = req.nextUrl.pathname;

  // Here, we are using decodeURIComponent to handle foreign languages like Hebrew
  const key = decodeURIComponent(path.split("/")[1]); // key is the first part of the path (e.g. dub.sh/stats/github -> stats)
  const fullKey = decodeURIComponent(path.slice(1)); // fullKey is the full path without the first slash (to account for multi-level subpaths, e.g. dub.sh/github/repo -> github/repo)

  // query is the query string (e.g. dub.sh/github/repo?utm_source=twitter -> ?utm_source=twitter)
  const query = req.nextUrl.search;

  return { domain, path, key, fullKey, query };
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

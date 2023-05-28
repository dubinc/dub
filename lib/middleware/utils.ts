import { NextRequest } from "next/server";
import { HOME_HOSTNAMES } from "@/lib/constants";
import { isHomeHostname } from "../utils";

export const parse = (req: NextRequest) => {
  let domain = req.headers.get("host") as string;
  domain = domain.replace("www.", ""); // remove www. from domain
  if (isHomeHostname(domain)) domain = "dub.sh"; // if domain is a home hostname, set it to dub.sh
  const path = req.nextUrl.pathname;
  const key = decodeURIComponent(path.split("/")[1]); // decodeURIComponentto handle foreign languages like Hebrew
  const fullKey = decodeURIComponent(path).slice(1);

  return { domain, path, key, fullKey };
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

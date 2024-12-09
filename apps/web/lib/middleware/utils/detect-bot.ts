import { IP_BOTS, UA_BOTS_REGEX } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";

export const detectBot = (req: Request) => {
  const searchParams = new URL(req.url).searchParams;

  if (searchParams.get("bot")) {
    return true;
  }

  if (detectBotInUserAgent(req)) {
    return true;
  }

  if (detectBotInIpAddress(req)) {
    return true;
  }

  return false;

  // TODO:
  // We may want to add some of the below ua to the ua bot regex

  // const ua = req.headers.get("User-Agent");
  // if (ua) {
  //   /* Note:
  //    * - bot is for most bots & crawlers
  //    * - metatags is for Dub.co Metatags API (https://api.dub.co/metatags)
  //    * - ChatGPT is for ChatGPT
  //    * - bluesky is for Bluesky crawler
  //    * - facebookexternalhit is for Facebook crawler
  //    * - WhatsApp is for WhatsApp crawler
  //    * - MetaInspector is for https://metatags.io/
  //    * - Go-http-client/1.1 is a bot: https://user-agents.net/string/go-http-client-1-1
  //    * - iframely is for https://iframely.com/docs/about (used by Notion, Linear)
  //    */
  //   return /bot|metatags|chatgpt|bluesky|facebookexternalhit|WhatsApp|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|MetaInspector|Go-http-client|iframely/i.test(
  //     ua,
  //   );
  // }
  // return false;
};

const detectBotInUserAgent = (req: Request) => {
  const ua = userAgent(req);

  if (!ua) {
    return false;
  }

  return ua.isBot || UA_BOTS_REGEX.test(ua.ua);
};

const detectBotInIpAddress = (req: Request) => {
  let ip = ipAddress(req);

  if (!ip) {
    return false;
  }

  if (ip.includes("/")) {
    ip = ip.split("/")[0];
  }

  return IP_BOTS.includes(ip);
};

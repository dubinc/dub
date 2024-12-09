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
};

const detectBotInUserAgent = (req: Request) => {
  // const ua = req.headers.get("User-Agent");
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

import { IP_BOTS, UA_BOTS_REGEX } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";

export const isBotRequest = (req: Request) => {
  return isBotUserAgent(req) || isBotIpAddress(req);
};

const isBotUserAgent = (req: Request) => {
  const ua = userAgent(req);

  if (!ua) {
    return false;
  }

  return ua.isBot || UA_BOTS_REGEX.test(ua.ua);
};

const isBotIpAddress = (req: Request) => {
  let ip = ipAddress(req);

  if (!ip) {
    return false;
  }

  if (ip.includes("/")) {
    ip = ip.split("/")[0];
  }

  return IP_BOTS.includes(ip);
};

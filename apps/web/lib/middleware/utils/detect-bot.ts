import { IP_BOTS, UA_BOTS } from "@dub/utils/src/constants";
import { ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";

export const detectBot = (req: Request) => {
  const searchParams = new URL(req.url).searchParams;

  if (searchParams.get("bot")) {
    return true;
  }

  // Check ua
  const ua = userAgent(req);

  if (!ua) {
    return false;
  }

  if (ua.isBot || UA_BOTS.some((bot) => new RegExp(bot, "i").test(ua.ua))) {
    return true;
  }

  // Check ip
  let ip = ipAddress(req);

  if (!ip) {
    return false;
  }

  if (ip.includes("/")) {
    ip = ip.split("/")[0];
  }

  return IP_BOTS.includes(ip);
};

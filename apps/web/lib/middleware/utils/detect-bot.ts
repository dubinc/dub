import { ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";
import { IP_BOTS, IP_RANGES_BOTS, UA_BOTS } from "./bots-list";
import { isIpInRange } from "./is-ip-in-range";

export const detectBot = (req: Request) => {
  const searchParams = new URL(req.url).searchParams;

  if (searchParams.get("bot")) {
    return true;
  }

  // Check ua
  const ua = userAgent(req);

  if (ua) {
    return ua.isBot || UA_BOTS.some((bot) => new RegExp(bot, "i").test(ua.ua));
  }

  // Check ip
  let ip = ipAddress(req);

  if (!ip) {
    return false;
  }

  // Check exact IP matches
  if (IP_BOTS.includes(ip)) {
    return true;
  }

  // Check CIDR ranges
  return IP_RANGES_BOTS.some((range) => isIpInRange(ip, range));
};

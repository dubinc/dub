import { ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";
import { IP_BOTS, IP_RANGES_BOTS, REFERRER_BOTS, UA_BOTS } from "./bots-list";
import { isIpInRange } from "./is-ip-in-range";

// UA fragments that look like a bot pattern but aren't – e.g. Instagram's
// in-app webview on Pixel devices appends "Google/google" in its device
// descriptor, which would otherwise trip the generic "google" entry in UA_BOTS
const UA_FALSE_POSITIVES = [/Google\/google\b/];

export const detectBot = (req: Request) => {
  const searchParams = new URL(req.url).searchParams;

  if (searchParams.get("bot")) {
    return true;
  }

  // HEAD requests are generally from bots, real users will always use GET requests
  if (req.method === "HEAD") {
    return true;
  }

  // Check ua
  const ua = userAgent(req);

  if (ua) {
    const isKnownFalsePositive = UA_FALSE_POSITIVES.some((pattern) =>
      pattern.test(ua.ua),
    );
    const sanitizedUa = UA_FALSE_POSITIVES.reduce(
      (s, pattern) => s.replace(pattern, ""),
      ua.ua,
    );
    return (
      (!isKnownFalsePositive && ua.isBot) ||
      UA_BOTS.some((bot) => new RegExp(bot, "i").test(sanitizedUa))
    );
  }

  // Check referer
  const referer = req.headers.get("referer");
  if (
    referer &&
    REFERRER_BOTS.some((bot) => new RegExp(bot, "i").test(referer))
  ) {
    return true;
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

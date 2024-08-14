import {
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
  capitalize,
  getDomainWithoutWWW,
} from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { nanoid } from "ai";
import { NextRequest, userAgent } from "next/server";
import { detectBot, detectQr, getIdentityHash } from "../middleware/utils";
import { conn } from "../planetscale";
import { ratelimit } from "../upstash";

/**
 * Recording clicks with geo, ua, referer and timestamp data
 **/
export async function recordClick({
  req,
  linkId,
  clickId,
  url,
}: {
  req: NextRequest;
  linkId: string;
  clickId?: string;
  url?: string;
}) {
  const isBot = detectBot(req);
  if (isBot) {
    return null; // don't record clicks from bots
  }
  const isQr = detectQr(req);

  // get continent & geolocation data
  const continent =
    process.env.VERCEL === "1"
      ? req.headers.get("x-vercel-ip-continent")
      : LOCALHOST_GEO_DATA.continent;
  const geo = process.env.VERCEL === "1" ? req.geo : LOCALHOST_GEO_DATA;

  const ua = userAgent(req);
  const referer = req.headers.get("referer");

  // deduplicate clicks from the same IP address + link ID – only record 1 click per hour
  const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
  const identity_hash = await getIdentityHash(req);
  const { success } = await ratelimit(1, "1 h").limit(
    `recordClick:${ip}:${linkId}`,
  );

  if (!success) {
    return null;
  }

  const clickEvent = {
    timestamp: new Date(Date.now()).toISOString(),
    identity_hash,
    click_id: clickId || nanoid(16),
    link_id: linkId,
    alias_link_id: "",
    url: url || "",
    ip:
      // only record IP if it's a valid IP and not from EU
      typeof ip === "string" && ip.trim().length > 0 && continent !== "EU"
        ? ip
        : "",
    continent: continent || "",
    country: geo?.country || "Unknown",
    city: geo?.city || "Unknown",
    region: geo?.region || "Unknown",
    latitude: geo?.latitude || "Unknown",
    longitude: geo?.longitude || "Unknown",
    device: capitalize(ua.device.type) || "Desktop",
    device_vendor: ua.device.vendor || "Unknown",
    device_model: ua.device.model || "Unknown",
    browser: ua.browser.name || "Unknown",
    browser_version: ua.browser.version || "Unknown",
    engine: ua.engine.name || "Unknown",
    engine_version: ua.engine.version || "Unknown",
    os: ua.os.name || "Unknown",
    os_version: ua.os.version || "Unknown",
    cpu_architecture: ua.cpu?.architecture || "Unknown",
    ua: ua.ua || "Unknown",
    bot: ua.isBot,
    qr: isQr,
    referer: referer ? getDomainWithoutWWW(referer) || "(direct)" : "(direct)",
    referer_url: referer || "(direct)",
  };

  return await Promise.allSettled([
    fetch(
      `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        },
        body: JSON.stringify(clickEvent),
      },
    ).then((res) => res.json()),

    // increment the click count for the link (based on their ID)
    conn.execute(
      "UPDATE Link SET clicks = clicks + 1, lastClicked = NOW() WHERE id = ?",
      [linkId],
    ),
    // if the link has a destination URL, increment the usage count for the workspace
    // and then we have a cron that will reset it at the start of new billing cycle
    url &&
      conn.execute(
        "UPDATE Project p JOIN Link l ON p.id = l.projectId SET p.usage = p.usage + 1 WHERE l.id = ?",
        [linkId],
      ),

    // send the click event to the webhook endpoint
    // sendToWebhook({
    //   webhook: null
    //   data: clickEvent,
    //   trigger: "link.clicked",
    // }),
  ]);
}

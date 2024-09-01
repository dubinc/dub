import {
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
  capitalize,
  getDomainWithoutWWW,
  nanoid,
} from "@dub/utils";
import { EU_COUNTRY_CODES } from "@dub/utils/src/constants/countries";
import { Link } from "@prisma/client";
import { ipAddress } from "@vercel/edge";
import { NextRequest, userAgent } from "next/server";
import {
  detectBot,
  detectQr,
  getFinalUrlForRecordClick,
  getIdentityHash,
} from "../middleware/utils";
import { conn } from "../planetscale";
import { ratelimit } from "../upstash";
import { webhookCache } from "../webhook/cache";
import { sendWebhooks } from "../webhook/qstash";
import { transformClickEventData } from "../webhook/transform";

/**
 * Recording clicks with geo, ua, referer and timestamp data
 **/
export async function recordClick({
  req,
  linkId,
  clickId,
  url,
  webhookIds,
}: {
  req: NextRequest;
  linkId: string;
  clickId?: string;
  url?: string;
  webhookIds?: string[];
}) {
  const searchParams = req.nextUrl.searchParams;

  // only track the click when there is no `dub-no-track` header or query param
  if (
    req.headers.has("dub-no-track") ||
    searchParams.get("dub-no-track") === "1"
  ) {
    return null;
  }

  const isBot = detectBot(req);

  // don't record clicks from bots
  if (isBot) {
    return null;
  }

  const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

  // deduplicate clicks from the same IP address + link ID – only record 1 click per hour
  const { success } = await ratelimit(1, "1 h").limit(
    `recordClick:${ip}:${linkId}`,
  );

  if (!success) {
    return null;
  }

  const isQr = detectQr(req);

  // get continent & geolocation data
  const continent =
    process.env.VERCEL === "1"
      ? req.headers.get("x-vercel-ip-continent")
      : LOCALHOST_GEO_DATA.continent;
  const geo = process.env.VERCEL === "1" ? req.geo : LOCALHOST_GEO_DATA;
  const isEuCountry = geo?.country && EU_COUNTRY_CODES.includes(geo.country);

  const ua = userAgent(req);
  const referer = req.headers.get("referer");

  const identity_hash = await getIdentityHash(req);

  const finalUrl = url ? getFinalUrlForRecordClick({ req, url }) : "";

  const clickData = {
    timestamp: new Date(Date.now()).toISOString(),
    identity_hash,
    click_id: clickId || nanoid(16),
    link_id: linkId,
    alias_link_id: "",
    url: finalUrl,
    ip:
      // only record IP if it's a valid IP and not from a EU country
      typeof ip === "string" && ip.trim().length > 0 && !isEuCountry ? ip : "",
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

  await Promise.allSettled([
    fetch(
      `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        },
        body: JSON.stringify(clickData),
      },
    ).then((res) => res.json()),

    // increment the click count for the link (based on their ID)
    // we have to use planetscale connection directly (not prismaEdge) because of connection pooling
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
  ]);

  // Send webhook events if link has webhooks enabled
  if (webhookIds && webhookIds.length > 0) {
    const webhooks = await webhookCache.mget(webhookIds);

    const linkWebhooks = webhooks.filter(
      (webhook) =>
        webhook.triggers &&
        Array.isArray(webhook.triggers) &&
        webhook.triggers.includes("link.clicked"),
    );

    if (linkWebhooks.length > 0) {
      const link = (await conn
        .execute("SELECT * FROM Link WHERE id = ?", [linkId])
        .then((res) => res.rows[0])) as Link;

      await sendWebhooks({
        trigger: "link.clicked",
        webhooks: linkWebhooks,
        // @ts-ignore – bot & qr should be boolean
        data: transformClickEventData({
          ...clickData,
          link,
        }),
      });
    }
  }
}

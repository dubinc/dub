import {
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
  capitalize,
  getDomainWithoutWWW,
} from "@dub/utils";
import { EU_COUNTRY_CODES } from "@dub/utils/src/constants/countries";
import { geolocation, ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";
import { ExpandedLink, transformLink } from "../api/links/utils/transform-link";
import {
  detectBot,
  detectQr,
  getFinalUrlForRecordClick,
  getIdentityHash,
} from "../middleware/utils";
import { conn } from "../planetscale";
import { WorkspaceProps } from "../types";
import { redis } from "../upstash";
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
  skipRatelimit,
  workspaceId,
}: {
  req: Request;
  linkId: string;
  clickId: string;
  url?: string;
  webhookIds?: string[];
  skipRatelimit?: boolean;
  workspaceId: string | undefined;
}) {
  const searchParams = new URL(req.url).searchParams;

  // only track the click when there is no `dub-no-track` header or query param
  if (req.headers.has("dub-no-track") || searchParams.has("dub-no-track")) {
    return null;
  }

  // don't record clicks from bots
  const isBot = detectBot(req);

  if (isBot) {
    return null;
  }

  const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

  const cacheKey = `recordClick:${linkId}:${ip}`;

  if (!skipRatelimit) {
    // by default, we deduplicate clicks from the same IP address + link ID – only record 1 click per hour
    // here, we check if the clickId is cached in Redis within the last hour
    const cachedClickId = await redis.get<string>(cacheKey);
    if (cachedClickId) {
      return null;
    }
  }

  const isQr = detectQr(req);

  // get continent, region & geolocation data
  // interesting, geolocation().region is Vercel's edge region – NOT the actual region
  // so we use the x-vercel-ip-country-region to get the actual region
  const { continent, region } =
    process.env.VERCEL === "1"
      ? {
          continent: req.headers.get("x-vercel-ip-continent"),
          region: req.headers.get("x-vercel-ip-country-region"),
        }
      : LOCALHOST_GEO_DATA;

  const geo =
    process.env.VERCEL === "1" ? geolocation(req) : LOCALHOST_GEO_DATA;

  const isEuCountry = geo.country && EU_COUNTRY_CODES.includes(geo.country);

  const ua = userAgent(req);
  const referer = req.headers.get("referer");

  const identity_hash = await getIdentityHash(req);

  const finalUrl = url ? getFinalUrlForRecordClick({ req, url }) : "";

  const clickData = {
    timestamp: new Date(Date.now()).toISOString(),
    identity_hash,
    click_id: clickId,
    link_id: linkId,
    alias_link_id: "",
    url: finalUrl,
    ip:
      // only record IP if it's a valid IP and not from a EU country
      typeof ip === "string" && ip.trim().length > 0 && !isEuCountry ? ip : "",
    continent: continent || "",
    country: geo.country || "Unknown",
    region: region || "Unknown",
    city: geo.city || "Unknown",
    latitude: geo.latitude || "Unknown",
    longitude: geo.longitude || "Unknown",
    vercel_region: geo.region || "",
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

  const hasWebhooks = webhookIds && webhookIds.length > 0;

  const [, , , , workspaceRows] = await Promise.all([
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

    // cache the click ID in Redis for 1 hour
    redis.set(cacheKey, clickId, {
      ex: 60 * 60,
    }),

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

    // fetch the workspace usage for the workspace
    workspaceId && hasWebhooks
      ? conn.execute(
          "SELECT usage, usageLimit FROM Project WHERE id = ? LIMIT 1",
          [workspaceId],
        )
      : null,
  ]);

  const workspace =
    workspaceRows && workspaceRows.rows.length > 0
      ? (workspaceRows.rows[0] as Pick<WorkspaceProps, "usage" | "usageLimit">)
      : null;

  const hasExceededUsageLimit =
    workspace && workspace.usage >= workspace.usageLimit;

  // Send webhook events if link has webhooks enabled and the workspace usage has not exceeded the limit
  if (hasWebhooks && !hasExceededUsageLimit) {
    await sendLinkClickWebhooks({ webhookIds, linkId, clickData });
  }
}

async function sendLinkClickWebhooks({
  webhookIds,
  linkId,
  clickData,
}: {
  webhookIds: string[];
  linkId: string;
  clickData: any;
}) {
  const webhooks = await webhookCache.mget(webhookIds);

  // Couldn't find webhooks in the cache
  // TODO: Should we look them up in the database?
  if (!webhooks || webhooks.length === 0) {
    return;
  }

  const activeLinkWebhooks = webhooks.filter((webhook) => {
    return (
      !webhook.disabledAt &&
      webhook.triggers &&
      Array.isArray(webhook.triggers) &&
      webhook.triggers.includes("link.clicked")
    );
  });

  if (activeLinkWebhooks.length === 0) {
    return;
  }

  const link = await conn
    .execute("SELECT * FROM Link WHERE id = ?", [linkId])
    .then((res) => res.rows[0]);

  await sendWebhooks({
    trigger: "link.clicked",
    webhooks: activeLinkWebhooks,
    // @ts-ignore – bot & qr should be boolean
    data: transformClickEventData({
      ...clickData,
      link: transformLink(link as ExpandedLink),
    }),
  });
}

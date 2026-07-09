import {
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
  capitalize,
  fetchWithRetry,
  getDomainWithoutWWW,
} from "@dub/utils";
import { EU_COUNTRY_CODES } from "@dub/utils/src/constants/countries";
import { geolocation, ipAddress, waitUntil } from "@vercel/functions";
import { userAgent } from "next/server";
import { recordClickCache } from "../api/links/record-click-cache";
import { detectBot } from "../middleware/utils/detect-bot";
import { detectQr } from "../middleware/utils/detect-qr";
import { getIdentityHash } from "../middleware/utils/get-identity-hash";
import { conn } from "../planetscale";
import { redis } from "../upstash";
import { publishPartnerActivityEvent } from "../upstash/redis-streams/partner-activity";
import { publishWorkspaceClickEvent } from "../upstash/redis-streams/workspace-click-events";
import { publishWorkspaceClicksUsageEvent } from "../upstash/redis-streams/workspace-clicks-usage";

/**
 * Recording clicks with geo, ua, referer and timestamp data
 **/
export async function recordClick({
  req,
  clickId,
  workspaceId,
  linkId,
  domain,
  key,
  url,
  programId,
  partnerId,
  skipRatelimit,
  timestamp,
  referrer,
  trigger = "link",
  shouldCacheClickId,
}: {
  req: Request;
  clickId?: string;
  linkId: string;
  workspaceId?: string;
  domain: string;
  key: string;
  url?: string;
  programId?: string;
  partnerId?: string;
  skipRatelimit?: boolean;
  timestamp?: string;
  referrer?: string;
  trigger?: string;
  shouldCacheClickId?: boolean;
}) {
  if (!clickId) {
    return null;
  }

  const searchParams = new URL(req.url).searchParams;

  // only track the click when there is no `dub-no-track` header or query param
  if (req.headers.has("dub-no-track") || searchParams.has("dub-no-track")) {
    return null;
  }

  const ua = userAgent(req);

  // only do bot checks for non deep link requests (link clicks/qr code scans)
  if (trigger !== "deeplink") {
    const isBot = detectBot(req);

    // don't record clicks from bots
    if (isBot) {
      console.log(`Click not recorded ❌ – Bot detected.`, {
        ua,
        isBot,
      });
      return null;
    }
  }

  const identityHash = await getIdentityHash(req);

  // by default, we deduplicate clicks for a domain + key pair from the same IP address – only record 1 click per hour
  // we only need to do these if skipRatelimit is not true (we skip it in /api/track/:path endpoints)
  if (!skipRatelimit) {
    try {
      // here, we check if the clickId is cached in Redis within the last hour
      const cachedClickId = await recordClickCache.get({
        domain,
        key,
        identityHash,
      });
      if (cachedClickId) {
        return null;
      }
    } catch (error) {
      console.error(`[recordClickCache error]: ${error}`);
      // if redis fails, return null so we don't overwhelm TB/MySQL
      return null;
    }
  }

  const isQr = detectQr(req);
  if (isQr) {
    trigger = "qr";
  }

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

  const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
  const isEuCountry = geo.country && EU_COUNTRY_CODES.includes(geo.country);

  const referer = referrer || req.headers.get("referer");

  const clickData = {
    timestamp: timestamp || new Date(Date.now()).toISOString(),
    identity_hash: identityHash,
    click_id: clickId,
    workspace_id: workspaceId || "",
    link_id: linkId,
    domain,
    key,
    url: url || "",
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
    trigger,
  };

  if (shouldCacheClickId) {
    // cache the click ID and its corresponding click data in Redis for 5 minutes
    // we're doing this because ingested click events are not available immediately in Tinybird
    await redis.set(`clickIdCache:${clickId}`, clickData, { ex: 60 * 5 });
  }

  waitUntil(
    (async () => {
      const response = await Promise.allSettled([
        fetchWithRetry(
          `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
            },
            body: JSON.stringify(clickData),
          },
        ).then((res) => res.json()),

        // cache the recorded click for the corresponding IP address in Redis for 1 hour
        recordClickCache.set({ domain, key, identityHash, clickId }),

        // increment the click count for the link (based on their ID)
        // we have to use planetscale connection directly (not prismaEdge) because of connection pooling
        conn.execute(
          "UPDATE Link SET clicks = clicks + 1, lastClicked = NOW() WHERE id = ?",
          [linkId],
        ),
        // if the link is associated with a workspace + has a destination URL
        // increment the usage count for the workspace
        workspaceId &&
          url &&
          publishWorkspaceClicksUsageEvent({
            linkId,
            workspaceId,
            timestamp: clickData.timestamp,
          }).catch(() => {
            // Fallback on writing directly to the database
            return conn.execute(
              "UPDATE Project p JOIN Link l ON p.id = l.projectId SET p.usage = p.usage + 1, p.totalClicks = p.totalClicks + 1 WHERE l.id = ?",
              [linkId],
            );
          }),

        programId &&
          partnerId &&
          publishPartnerActivityEvent({
            programId,
            partnerId,
            eventType: "click",
            timestamp: new Date().toISOString(),
          }).catch(() => {
            // Fallback on writing directly to the database
            return conn.execute(
              "UPDATE ProgramEnrollment SET totalClicks = totalClicks + 1 WHERE programId = ? AND partnerId = ?",
              [programId, partnerId],
            );
          }),

        // Publish the click event
        publishWorkspaceClickEvent(clickData),
      ]);

      // Find the rejected promises and log them
      if (response.some((result) => result.status === "rejected")) {
        const errors = response
          .map((result, index) => {
            if (result.status === "rejected") {
              const operations = [
                "Tinybird click event ingestion",
                "recordClickCache set",
                "Link clicks increment",
                "Workspace usage increment",
                "Program enrollment totalClicks increment",
                "Workspace click event publish",
              ];
              return {
                operation: operations[index] || `Operation ${index}`,
                error: result.reason,
                errorString: JSON.stringify(result.reason, null, 2),
              };
            }
            return null;
          })
          .filter((err): err is NonNullable<typeof err> => err !== null);

        console.error("[Record click] - Rejected promises:", {
          totalErrors: errors.length,
          errors: errors.map((err) => ({
            operation: err.operation,
            error: err.error,
            errorString: err.errorString,
          })),
        });
      }
    })(),
  );

  return clickData;
}

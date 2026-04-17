import { getIdentityHash } from "@/lib/middleware/utils/get-identity-hash";
import { tb } from "@/lib/tinybird/client";
import {
  capitalize,
  getDomainWithoutWWW,
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
} from "@dub/utils";
import { EU_COUNTRY_CODES } from "@dub/utils/src/constants/countries";
import { geolocation, ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";
import * as z from "zod/v4";

// The schema which represents the data that will be ingested into the tinybird datasource
const applicationEventSchemaTB = z.object({
  timestamp: z.string(),
  application_id: z.string(),
  partner_id: z.string().default(""),
  program_id: z.string().default(""),
  event_name: z.string(),
  pathname: z.string(),
  url: z.string(),
  continent: z.string().default(""),
  country: z.string().default("Unknown"),
  city: z.string().default("Unknown"),
  region: z.string().default("Unknown"),
  latitude: z.string().default("Unknown"),
  longitude: z.string().default("Unknown"),
  device: z.string().default("Desktop"),
  browser: z.string().default("Unknown"),
  os: z.string().default("Unknown"),
  ua: z.string().default("Unknown"),
  referer: z.string().default("(direct)"),
  referer_url: z.string().default("(direct)"),
  ip: z.string().default(""),
  identity_hash: z.string().default(""),
  device_model: z.string().default("Unknown"),
  device_vendor: z.string().default("Unknown"),
  browser_version: z.string().default("Unknown"),
  os_version: z.string().default("Unknown"),
  engine: z.string().default("Unknown"),
  engine_version: z.string().default("Unknown"),
  cpu_architecture: z.string().default("Unknown"),
});

export const ingestApplicationEvent = tb.buildIngestEndpoint({
  datasource: "dub_application_events",
  event: applicationEventSchemaTB,
  wait: true,
});

const recordApplicationEventParamsSchema = z.object({
  applicationId: z.string(),
  eventName: z.string(),
  partnerId: z.string().nullish(),
  programId: z.string().nullish(),
  req: z.custom<Request>().optional(),
  url: z.string().optional(),
  referer: z.string().optional(),
});

export type RecordApplicationEventParams = z.infer<
  typeof recordApplicationEventParamsSchema
>;

function pathnameFromUrl(url: string): string {
  if (url.startsWith("/")) return url;
  try {
    return new URL(url, "https://dub.co").pathname;
  } catch {
    return "/";
  }
}

// TODO
// Improve this
async function getRequestData(params: {
  req?: Request | null;
  url?: string | null;
  referer?: string | null;
}) {
  const { req, url, referer } = params;
  const refererHeader = req?.headers?.get("referer");
  const pathname = req
    ? new URL(req.url).pathname
    : url
      ? pathnameFromUrl(url)
      : "/";

  const fullUrl = req != null ? req.url : url != null && url !== "" ? url : "";
  const finalRefererRaw = referer ?? refererHeader ?? "";
  const finalReferer = finalRefererRaw
    ? getDomainWithoutWWW(finalRefererRaw) || "(direct)"
    : "(direct)";
  const finalRefererUrl = finalRefererRaw || "(direct)";

  // continent/region from headers (Vercel) or LOCALHOST_GEO_DATA; geo.region is edge region, not user region
  const { continent, region } =
    req && process.env.VERCEL === "1"
      ? {
          continent: req.headers.get("x-vercel-ip-continent"),
          region: req.headers.get("x-vercel-ip-country-region"),
        }
      : req
        ? LOCALHOST_GEO_DATA
        : { continent: null as string | null, region: null as string | null };

  const geo =
    req && process.env.VERCEL === "1"
      ? geolocation(req)
      : req
        ? LOCALHOST_GEO_DATA
        : {
            country: "Unknown",
            city: "Unknown",
            region: "Unknown",
            latitude: "Unknown",
            longitude: "Unknown",
          };
  const ip =
    req && process.env.VERCEL === "1"
      ? ipAddress(req)
      : req
        ? LOCALHOST_IP
        : "";
  const isEuCountry = geo.country && EU_COUNTRY_CODES.includes(geo.country);
  const ipToStore =
    typeof ip === "string" && ip.trim().length > 0 && !isEuCountry ? ip : "";

  const identityHash = req ? await getIdentityHash(req) : "";
  const ua = req ? userAgent(req) : null;

  return {
    pathname,
    fullUrl,
    finalReferer,
    finalRefererUrl,
    continent: continent ?? "",
    region: region ?? "Unknown",
    geo,
    ipToStore,
    identityHash,
    ua,
  };
}

export async function recordApplicationEvent({
  applicationId,
  programId,
  partnerId,
  eventName,
  req,
  url,
  referer,
}: RecordApplicationEventParams) {
  const ctx = await getRequestData({ req, url, referer });

  const eventData: z.infer<typeof applicationEventSchemaTB> = {
    timestamp: new Date(Date.now()).toISOString(),
    application_id: applicationId,
    partner_id: partnerId ?? "",
    program_id: programId ?? "",
    event_name: eventName,
    pathname: ctx.pathname,
    url: ctx.fullUrl,
    continent: ctx.continent,
    country: ctx.geo.country || "Unknown",
    city: ctx.geo.city || "Unknown",
    region: ctx.region,
    latitude: ctx.geo.latitude || "Unknown",
    longitude: ctx.geo.longitude || "Unknown",
    device: ctx.ua ? capitalize(ctx.ua.device.type) || "Desktop" : "Desktop",
    browser: ctx.ua?.browser?.name ?? "Unknown",
    os: ctx.ua?.os?.name ?? "Unknown",
    ua: ctx.ua?.ua ?? "Unknown",
    referer: ctx.finalReferer,
    referer_url: ctx.finalRefererUrl,
    ip: ctx.ipToStore,
    identity_hash: ctx.identityHash,
    device_model: ctx.ua?.device?.model ?? "Unknown",
    device_vendor: ctx.ua?.device?.vendor ?? "Unknown",
    browser_version: ctx.ua?.browser?.version ?? "Unknown",
    os_version: ctx.ua?.os?.version ?? "Unknown",
    engine: ctx.ua?.engine?.name ?? "Unknown",
    engine_version: ctx.ua?.engine?.version ?? "Unknown",
    cpu_architecture: ctx.ua?.cpu?.architecture ?? "Unknown",
  };

  try {
    await ingestApplicationEvent(eventData);

    // console.log("Application event ingested successfully", eventData);
  } catch (error) {
    console.error("Failed to ingest application event", error);
  }
}

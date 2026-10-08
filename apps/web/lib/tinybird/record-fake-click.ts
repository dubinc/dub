import { COUNTRIES_TO_CONTINENTS, nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { recordClick } from "./record-click";

// HTTP headers must be ByteString (Latin-1); non-Latin-1 values cause fetch to throw.
function toSafeHeaderValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  // We return "Unknown" for non-Latin-1 values.
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 255) {
      return "Unknown";
    }
  }

  return value;
}

// TODO:
// Use this in other places where we need to record a fake click event (Eg: import-customers)
export async function recordFakeClick({
  link,
  customer,
  timestamp,
  referrer,
  userAgent,
}: {
  link: Pick<Link, "id" | "url" | "domain" | "key" | "projectId"> & {
    programId?: string | null;
    partnerId?: string | null;
  };
  customer?: {
    country?: string | null;
    region?: string | null;
    continent?: string | null;
    city?: string | null;
    latitude?: string | null;
    longitude?: string | null;
  };
  timestamp?: string | number;
  referrer?: string | null;
  userAgent?: string | null;
}) {
  const country = toSafeHeaderValue(customer?.country) || "US";
  const continent =
    toSafeHeaderValue(customer?.continent) ||
    COUNTRIES_TO_CONTINENTS[country] ||
    "NA";

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent":
        toSafeHeaderValue(userAgent) ||
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": country,
      "x-vercel-ip-country-region": toSafeHeaderValue(customer?.region) || "CA",
      "x-vercel-ip-continent": continent,
      ...(customer?.city && {
        "x-vercel-ip-city": toSafeHeaderValue(customer.city) || "Unknown",
      }),
      ...(customer?.latitude && {
        "x-vercel-ip-latitude":
          toSafeHeaderValue(customer.latitude) || "Unknown",
      }),
      ...(customer?.longitude && {
        "x-vercel-ip-longitude":
          toSafeHeaderValue(customer.longitude) || "Unknown",
      }),
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    clickId: nanoid(16),
    workspaceId: link.projectId!,
    linkId: link.id,
    domain: link.domain,
    key: link.key,
    url: link.url,
    programId: link.programId ?? undefined,
    partnerId: link.partnerId ?? undefined,
    skipRatelimit: true,
    shouldCacheClickId: true,
    ...(referrer && { referrer }),
    ...(timestamp && { timestamp: new Date(timestamp).toISOString() }),
  });

  if (!clickData) {
    throw new Error("Failed to record fake click.");
  }

  return clickEventSchemaTB.parse({
    ...clickData,
    timestamp: clickData.timestamp.replace("T", " ").replace("Z", ""),
    bot: 0,
    qr: 0,
  });
}

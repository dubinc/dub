import { getIdentityHash } from "@/lib/middleware/utils/get-identity-hash";
import { prisma } from "@dub/prisma";
import {
  capitalize,
  getDomainWithoutWWW,
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
} from "@dub/utils";
import { EU_COUNTRY_CODES } from "@dub/utils/src/constants/countries";
import { geolocation, ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";

function deriveReferralSource(referer: string | null): string {
  if (!referer) {
    return "direct";
  }

  if (
    /(app\.dub\.co|partners\.dub\.co)\/(partners\/)?marketplace/.test(referer)
  ) {
    return "marketplace";
  }

  return getDomainWithoutWWW(referer) || "direct";
}

async function buildRequestContext(req: Request | undefined) {
  if (!req) {
    return {
      country: null,
      referralSource: "direct",
      metadata: {},
    };
  }

  const isVercel = process.env.VERCEL === "1";
  const geo = isVercel ? geolocation(req) : LOCALHOST_GEO_DATA;
  const ip = isVercel ? ipAddress(req) : LOCALHOST_IP;
  const ua = userAgent(req);
  const identityHash = await getIdentityHash(req);
  const refererHeader = req.headers.get("referer");
  const country = geo.country || null;
  const isEuCountry = country && EU_COUNTRY_CODES.includes(country);
  const { continent, region } = isVercel
    ? {
        continent: req.headers.get("x-vercel-ip-continent"),
        region: req.headers.get("x-vercel-ip-country-region"),
      }
    : LOCALHOST_GEO_DATA;

  return {
    country,
    referralSource: deriveReferralSource(refererHeader),
    metadata: {
      ip: ip && !isEuCountry ? ip : "",
      identity_hash: identityHash,
      url: req.url,
      ua: ua.ua || "Unknown",
      browser: ua.browser.name || "Unknown",
      browser_version: ua.browser.version || "Unknown",
      engine: ua.engine.name || "Unknown",
      engine_version: ua.engine.version || "Unknown",
      os: ua.os.name || "Unknown",
      os_version: ua.os.version || "Unknown",
      device: capitalize(ua.device.type) || "Desktop",
      device_model: ua.device.model || "Unknown",
      device_vendor: ua.device.vendor || "Unknown",
      cpu_architecture: ua.cpu?.architecture || "Unknown",
      continent: continent || "",
      city: geo.city || "Unknown",
      region: region || "Unknown",
      latitude: geo.latitude || "Unknown",
      longitude: geo.longitude || "Unknown",
      full_referer_url: refererHeader || "",
    },
  };
}

export async function trackApplicationVisit({
  req,
  programId,
  partnerId,
  eventId,
  referrerUsername,
}: {
  req?: Request;
  programId: string;
  partnerId?: string | null;
  eventId?: string | null;
  referrerUsername?: string | null;
}) {
  const [ctx, referredByPartnerId] = await Promise.all([
    buildRequestContext(req),

    referrerUsername
      ? prisma.partner.findUnique({
          where: {
            username: referrerUsername,
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  console.log({ programId, partnerId, ctx, referredByPartnerId });
}

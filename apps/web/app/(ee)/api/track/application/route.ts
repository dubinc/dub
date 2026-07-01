import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { createId } from "@/lib/api/create-id";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { parseRequestBody } from "@/lib/api/utils";
import { getIP } from "@/lib/api/utils/get-ip";
import {
  APPLICATION_ID_COOKIE_MAX_AGE,
  trackApplicationEventSchema,
} from "@/lib/application-events/schema";
import { getApplicationEventCookieName } from "@/lib/application-events/utils";
import { getSession } from "@/lib/auth";
import { withAxiom } from "@/lib/axiom/server";
import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { getIdentityHash } from "@/lib/middleware/utils/get-identity-hash";
import { prisma } from "@/lib/prisma";
import {
  recordClickZod,
  recordClickZodSchema,
} from "@/lib/tinybird/record-click-zod";
import { ratelimit } from "@/lib/upstash";
import { MARKETPLACE_RESERVED_SLUGS } from "@/ui/program-marketplace/utils/urls";
import {
  capitalize,
  EU_COUNTRY_CODES,
  getDomainWithoutWWW,
  getSearchParams,
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
  nanoid,
  NETWORK_PROGRAM_ID,
  NETWORK_PROGRAM_SLUG,
  NETWORK_WORKSPACE_ID,
} from "@dub/utils";
import { Partner, Program } from "@prisma/client";
import { geolocation, ipAddress, waitUntil } from "@vercel/functions";
import { cookies } from "next/headers";
import { NextRequest, NextResponse, userAgent } from "next/server";

// POST /api/track/application – Track an application event
export const POST = withAxiom(async (req) => {
  try {
    if (detectBot(req)) {
      return NextResponse.json(
        { ok: true },
        { status: 202, headers: COMMON_CORS_HEADERS },
      );
    }

    const ip = await getIP();
    const { success } = await ratelimit(10, "10 s").limit(
      `track-application:${ip}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
      });
    }

    const { eventName, url, referrer } = trackApplicationEventSchema.parse(
      await parseRequestBody(req),
    );

    const { programSlug, isMarketplace } = identityProgramSlug(url);

    if (!programSlug) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Couldn't identify the program slug from the URL. Skipping tracking...",
      });
    }

    let program: Pick<Program, "id"> | null = null;

    if (programSlug === NETWORK_PROGRAM_SLUG) {
      program = {
        id: NETWORK_PROGRAM_ID,
      };
    } else {
      program = await prisma.program.findUnique({
        where: {
          slug: programSlug.toLowerCase(),
        },
        select: {
          id: true,
        },
      });
    }

    if (!program) {
      throw new DubApiError({
        code: "bad_request",
        message: `Program not found for slug ${programSlug}. Skipping tracking...`,
      });
    }

    if (eventName === "visit") {
      await trackVisitEvent({
        req,
        program,
        url,
        referrer,
        isMarketplace,
      });
    } else if (eventName === "start") {
      await trackStartEvent({
        req,
        program,
      });
    }

    return NextResponse.json(
      { ok: true },
      { status: 202, headers: COMMON_CORS_HEADERS },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, COMMON_CORS_HEADERS);
  }
});

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: COMMON_CORS_HEADERS,
  });
};

// Track the "visit" event
async function trackVisitEvent({
  req,
  program,
  url,
  referrer,
  isMarketplace,
}: {
  req: NextRequest;
  program: Pick<Program, "id">;
  url: string;
  referrer: string | null | undefined;
  isMarketplace: boolean;
}) {
  const cookieName = getApplicationEventCookieName(program.id);
  const existingEventId = req.cookies.get(cookieName)?.value;

  if (existingEventId) {
    console.log(
      `"visit" event already tracked for program ${program.id}. Skipping tracking...`,
    );
    return;
  }

  // Find the partner who referred the application
  const searchParams = getSearchParams(url);
  let referredByPartner: Pick<Partner, "id"> | null = null;

  if (searchParams.via) {
    const partner = await prisma.partner.findUnique({
      where: {
        username: searchParams.via.toLowerCase(),
      },
      select: {
        id: true,
      },
    });

    if (partner) {
      referredByPartner = partner;
    } else {
      console.log(
        `Partner not found for username ${searchParams.via}. Not setting referredByPartnerId.`,
      );
    }
  }

  const session = await getSession();
  const partnerId = session?.user?.defaultPartnerId;

  if (partnerId) {
    const existingEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId: program.id,
        },
      },
      select: {
        partnerId: true,
      },
    });

    if (existingEnrollment) {
      console.log(
        `Partner ${partnerId} is already enrolled in program ${program.id}. Skipping visit tracking...`,
      );
      return;
    }

    const isSelfReferral =
      referredByPartner?.id && partnerId === referredByPartner.id;

    if (isSelfReferral) {
      console.log(
        `Self-referral detected for partner ${partnerId} on program ${program.id}. Skipping visit tracking...`,
      );
      return;
    }
  }

  const requestContext = await getRequestContext(req, { referrer, url });

  try {
    const programApplicationEvent = await prisma.programApplicationEvent.create(
      {
        data: {
          id: createId({ prefix: "pga_evt_" }),
          programId: program.id,
          referralSource: isMarketplace
            ? "marketplace"
            : referrer
              ? getDomainWithoutWWW(referrer) || "direct"
              : "direct",
          referredByPartnerId: referredByPartner?.id,
          partnerId,
          visitedAt: new Date(),
          country: requestContext.country,
          metadata: requestContext,
        },
      },
    );

    console.log(
      `Created "visit" event for program ${program.id} with eventId: ${programApplicationEvent.id}`,
    );

    const cookieStore = await cookies();

    cookieStore.set(cookieName, programApplicationEvent.id, {
      httpOnly: true,
      maxAge: APPLICATION_ID_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } catch (e) {
    console.error(`Error tracking "visit" event for program ${program.id}`, e);
  }

  // for network program application events, track the click event
  if (referredByPartner) {
    waitUntil(
      (async () => {
        const networkReferralLink = await prisma.link.findFirst({
          where: {
            programId: NETWORK_PROGRAM_ID,
            partnerId: referredByPartner.id,
          },
        });

        if (!networkReferralLink) {
          console.log(
            `No network referral link found for partner ${referredByPartner.id} (not enrolled in network program yet), skipping...`,
          );
          return;
        }

        // add additional click event data to the request context
        const generatedClickEvent = recordClickZodSchema.parse({
          ...requestContext,
          timestamp: new Date().toISOString(),
          workspace_id: NETWORK_WORKSPACE_ID,
          link_id: networkReferralLink.id,
          domain: networkReferralLink.domain,
          key: networkReferralLink.key,
        });

        await recordClickZod(generatedClickEvent);
        console.log(
          `Tracked click event for network partner ${referredByPartner.id}`,
        );

        await prisma.link.update({
          where: {
            id: networkReferralLink.id,
          },
          data: {
            clicks: { increment: 1 },
            lastClicked: new Date(),
          },
        });
        console.log(
          `Updated link ${networkReferralLink.id} to ${networkReferralLink.clicks + 1} clicks`,
        );

        await syncPartnerLinksStats({
          partnerId: referredByPartner.id,
          programId: NETWORK_PROGRAM_ID,
          eventType: "click",
        });
        console.log(`Synced click stats for partner ${referredByPartner.id}`);
      })(),
    );
  }
}

// Track the "start" event
async function trackStartEvent({
  req,
  program,
}: {
  req: NextRequest;
  program: Pick<Program, "id">;
}) {
  const cookieName = getApplicationEventCookieName(program.id);
  const eventId = req.cookies.get(cookieName)?.value;

  if (!eventId) {
    throw new DubApiError({
      code: "bad_request",
      message: `"start" event not tracked for program ${program.id} because cookie was not found. Skipping tracking...`,
    });
  }

  const session = await getSession();
  const partnerId = session?.user?.defaultPartnerId;

  try {
    const applicationEvent = partnerId
      ? await prisma.programApplicationEvent.findUnique({
          where: {
            id: eventId,
          },
          select: {
            referredByPartnerId: true,
          },
        })
      : null;

    const isSelfReferral =
      partnerId &&
      applicationEvent?.referredByPartnerId &&
      partnerId === applicationEvent.referredByPartnerId;

    await prisma.programApplicationEvent.update({
      where: {
        id: eventId,
        startedAt: null,
      },
      data: {
        startedAt: new Date(),
        ...(partnerId ? { partnerId } : {}),
        ...(isSelfReferral ? { referredByPartnerId: null } : {}),
      },
    });

    console.log(
      `Tracked "start" event for program ${program.id} with eventId: ${eventId}`,
    );
  } catch {}
}

// Get the request context
async function getRequestContext(
  req: NextRequest,
  { referrer, url }: { referrer: string | null | undefined; url: string },
) {
  const isVercel = process.env.VERCEL === "1";

  const click_id = nanoid(16);
  const identity_hash = await getIdentityHash(req);
  const ua = userAgent(req);

  const ip = isVercel ? ipAddress(req) : LOCALHOST_IP;
  const geo = isVercel ? geolocation(req) : LOCALHOST_GEO_DATA;

  const continent = isVercel
    ? req.headers.get("x-vercel-ip-continent")
    : LOCALHOST_GEO_DATA.continent;

  const region = isVercel
    ? req.headers.get("x-vercel-ip-country-region")
    : LOCALHOST_GEO_DATA.region;

  const isEuCountry = geo.country && EU_COUNTRY_CODES.includes(geo.country);

  return {
    identity_hash,
    click_id,
    url,
    ip:
      typeof ip === "string" && ip.trim().length > 0 && !isEuCountry
        ? ip
        : undefined,
    continent,
    country: geo.country,
    region,
    city: geo.city,
    latitude: geo.latitude,
    longitude: geo.longitude,
    vercel_region: geo.region,
    device: capitalize(ua.device.type),
    device_vendor: ua.device.vendor,
    device_model: ua.device.model,
    browser: ua.browser.name,
    browser_version: ua.browser.version,
    engine: ua.engine.name,
    engine_version: ua.engine.version,
    os: ua.os.name,
    os_version: ua.os.version,
    cpu_architecture: ua.cpu?.architecture,
    ua: ua.ua,
    referer: referrer ? getDomainWithoutWWW(referrer) || "direct" : "direct",
    referer_url: referrer || "direct",
  };
}

// Identify the program slug from the URL
// Supports:
//   - https://partners.dub.co/{programSlug}
//   - https://partners.dub.co/programs/{programSlug}/apply
//   - https://partners.dub.co/marketplace/{programSlug}
//   - https://dub.co/marketplace/{programSlug}
//   - https://partners.dub.co/programs/marketplace/{programSlug} (legacy)
//   - https://partners.dub.co/register (platform-level signup -> network program)
//
// Marketplace list routes (no program slug):
//   - /marketplace
//   - /marketplace/all
//   - /marketplace/c/{category}
function identityProgramSlug(url: string) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return { programSlug: null, isMarketplace: false };
    }

    if (parts[0] === "register") {
      return { programSlug: NETWORK_PROGRAM_SLUG, isMarketplace: false };
    }

    if (parts[0] === "marketplace") {
      if (parts.length === 1) {
        return { programSlug: null, isMarketplace: true };
      }

      if (parts[1] === "c") {
        return { programSlug: null, isMarketplace: true };
      }

      if (parts.length === 2) {
        if (MARKETPLACE_RESERVED_SLUGS.has(parts[1])) {
          return { programSlug: null, isMarketplace: true };
        }

        return {
          programSlug: parts[1].toLowerCase(),
          isMarketplace: true,
        };
      }

      return { programSlug: null, isMarketplace: true };
    }

    if (parts[0] === "programs" && parts[1] === "marketplace") {
      if (!parts[2] || MARKETPLACE_RESERVED_SLUGS.has(parts[2])) {
        return { programSlug: null, isMarketplace: false };
      }

      return {
        programSlug: parts[2].toLowerCase(),
        isMarketplace: true,
      };
    }

    if (parts[0] === "programs") {
      if (!parts[1]) {
        return { programSlug: null, isMarketplace: false };
      }

      return {
        programSlug: parts[1].toLowerCase(),
        isMarketplace: false,
      };
    }

    return {
      programSlug: parts[0].toLowerCase(),
      isMarketplace: false,
    };
  } catch {
    return { programSlug: null, isMarketplace: false };
  }
}

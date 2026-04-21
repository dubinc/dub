import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { createId } from "@/lib/api/create-id";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getIP } from "@/lib/api/utils/get-ip";
import {
  APPLICATION_ID_COOKIE_MAX_AGE,
  trackApplicationEventBodySchema,
} from "@/lib/application-events/schema";
import { getApplicationEventCookieName } from "@/lib/application-events/utils";
import { getSession } from "@/lib/auth";
import { withAxiom } from "@/lib/axiom/server";
import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { getIdentityHash } from "@/lib/middleware/utils/get-identity-hash";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Partner, Program } from "@dub/prisma/client";
import {
  capitalize,
  EU_COUNTRY_CODES,
  getDomainWithoutWWW,
  getSearchParams,
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
} from "@dub/utils";
import { geolocation, ipAddress } from "@vercel/functions";
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

    const { eventName, url, referrer } = trackApplicationEventBodySchema.parse(
      await parseRequestBody(req),
    );

    const programSlug = identityProgramSlug(url);

    if (!programSlug) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Couldn't identify the program slug from the URL. Skipping tracking...",
      });
    }

    const program = await prisma.program.findUnique({
      where: {
        slug: programSlug.toLowerCase(),
      },
      select: {
        id: true,
      },
    });

    if (!program) {
      throw new DubApiError({
        code: "bad_request",
        message: `Program not found for slug ${programSlug}. Skipping tracking...`,
      });
    }

    const eventId = createId({ prefix: "pga_evt_" });

    if (eventName === "visit") {
      await trackVisitEvent({
        req,
        program,
        url,
        referrer,
        eventId,
      });
    } else if (eventName === "start") {
      await trackStartEvent({
        req,
        program,
      });
    }

    return NextResponse.json(
      { eventId },
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
  eventId,
}: {
  req: NextRequest;
  program: Pick<Program, "id">;
  url: string;
  referrer: string | null | undefined;
  eventId: string;
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
  const requestContext = await getRequestContext(req);

  try {
    await prisma.programApplicationEvent.create({
      data: {
        id: eventId,
        programId: program.id,
        referralSource: referrer
          ? getDomainWithoutWWW(referrer) || "(direct)"
          : "(direct)",
        referredByPartnerId: referredByPartner?.id,
        partnerId: session?.user?.defaultPartnerId,
        visitedAt: new Date(),
        country: requestContext.country,
        metadata: requestContext,
      },
    });

    console.log(
      `Created "visit" event for program ${program.id} with eventId: ${eventId}`,
    );

    const cookieStore = await cookies();

    cookieStore.set(cookieName, eventId, {
      httpOnly: true,
      maxAge: APPLICATION_ID_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  } catch {}
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
    await prisma.programApplicationEvent.update({
      where: {
        id: eventId,
        startedAt: null,
      },
      data: {
        startedAt: new Date(),
        ...(partnerId ? { partnerId } : {}),
      },
    });

    console.log(
      `Tracked "start" event for program ${program.id} with eventId: ${eventId}`,
    );
  } catch {}
}

// Get the request context
async function getRequestContext(req: NextRequest) {
  const isVercel = process.env.VERCEL === "1";

  const identityHash = await getIdentityHash(req);
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
    identityHash,
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
    ip:
      typeof ip === "string" && ip.trim().length > 0 && !isEuCountry
        ? ip
        : undefined,
  };
}

// Identify the program slug from the URL
// Supports:
//   - https://partners.dub.co/{programSlug}
//   - https://partners.dub.co/programs/marketplace/{programSlug}
function identityProgramSlug(url: string) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return null;
    }

    const programSlug =
      parts[0] === "programs" && parts[1] === "marketplace"
        ? parts[2]
        : parts[0];

    return programSlug?.toLowerCase() ?? null;
  } catch (error) {
    return null;
  }
}

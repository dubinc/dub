import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { createId } from "@/lib/api/create-id";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getIP } from "@/lib/api/utils/get-ip";
import { APPLICATION_ID_COOKIE_PREFIX } from "@/lib/application-events/constants";
import { trackApplicationEventBodySchema } from "@/lib/application-events/schema";
import { getSession } from "@/lib/auth";
import { withAxiom } from "@/lib/axiom/server";
import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Partner, Program } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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
  const cookieName = getApplicationIdCookieName(program.id);
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

  await prisma.programApplicationEvent.create({
    data: {
      id: eventId,
      programId: program.id,
      referralSource: referrer || "direct",
      referredByPartnerId: referredByPartner?.id,
      partnerId: session.user.defaultPartnerId,
      visitedAt: new Date(),
      metadata: {
        userAgent: req.headers.get("user-agent"),
      },
    },
  });

  console.log(
    `Created "visit" event for program ${program.id} with eventId: ${eventId}`,
  );

  const cookieStore = await cookies();
  cookieStore.set(cookieName, eventId);
}

// Track the "start" event
async function trackStartEvent({
  req,
  program,
}: {
  req: NextRequest;
  program: Pick<Program, "id">;
}) {
  const cookieName = getApplicationIdCookieName(program.id);
  const existingEventId = req.cookies.get(cookieName)?.value;

  if (!existingEventId) {
    throw new DubApiError({
      code: "bad_request",
      message: `"start" event not tracked for program ${program.id} because cookie was not found. Skipping tracking...`,
    });
  }

  try {
    await prisma.programApplicationEvent.update({
      where: {
        id: existingEventId,
        startedAt: null,
      },
      data: {
        startedAt: new Date(),
      },
    });
  } catch (error) {
    // Ignore the error
  }
}

// Identify the program slug from the URL
function identityProgramSlug(url: string) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");

    if (parts.length < 2) {
      return null;
    }

    const programSlug = parts[1];

    console.log({ programSlug });

    return programSlug.toLowerCase();
  } catch (error) {
    return null;
  }
}

// Get the cookie name for the application ID
function getApplicationIdCookieName(programId: string) {
  return `${APPLICATION_ID_COOKIE_PREFIX}${programId}`;
}

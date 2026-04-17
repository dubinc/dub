import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { createId } from "@/lib/api/create-id";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getIP } from "@/lib/api/utils/get-ip";
import { getApplicationIdCookieName } from "@/lib/application-events/constants";
import { applicationEventInputSchema } from "@/lib/application-events/schema";
import { getSession } from "@/lib/auth";
import { withAxiom } from "@/lib/axiom/server";
import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

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

    const { eventName, referrerUsername, programSlug } =
      applicationEventInputSchema.parse(await parseRequestBody(req));

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        slug: programSlug.toLowerCase(),
      },
      select: {
        id: true,
      },
    });

    const session = await getSession();

    if (eventName === "visit") {
      const cookieName = getApplicationIdCookieName(program.id);
      const existingEventId = req.cookies.get(cookieName)?.value;

      if (existingEventId) {
        return NextResponse.json(
          { ok: true },
          { status: 202, headers: COMMON_CORS_HEADERS },
        );
      }
    }

    const eventId = createId({ prefix: "pga_evt_" });

    // TODO:
    // Track the application event

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

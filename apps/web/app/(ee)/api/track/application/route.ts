import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getIP } from "@/lib/api/utils/get-ip";
import { APPLICATION_ID_COOKIE } from "@/lib/application-tracker/constants";
import { recordApplicationEvent } from "@/lib/application-tracker/record-application-event";
import { trackApplicationInputSchema } from "@/lib/application-tracker/schema";
import { withAxiom } from "@/lib/axiom/server";
import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { addDays } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function extractProgramFromPathname(pathname: string) {
  return pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? null;
}

// POST /api/track/application – Track an application event
export const POST = withAxiom(async (req) => {
  try {
    if (detectBot(req)) {
      return NextResponse.json(
        { applicationId: null },
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

    let { eventName, pathname, applicationId, referrerUsername } =
      trackApplicationInputSchema.parse(await parseRequestBody(req));

    // Extract the program slug from pathname
    const programSlug = extractProgramFromPathname(pathname);

    if (!programSlug) {
      throw new DubApiError({
        code: "bad_request",
        message: "Couldn't extract program slug from pathname.",
      });
    }

    // Find the program
    const program = await prisma.program.findUnique({
      where: {
        slug: programSlug,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!program) {
      throw new DubApiError({
        code: "bad_request",
        message: "Program not found.",
      });
    }

    // Set or create cookie
    if (!applicationId) {
      applicationId = nanoid(16);

      const cookieStore = await cookies();

      cookieStore.set(APPLICATION_ID_COOKIE, applicationId, {
        expires: addDays(new Date(), 7),
        path: `/${program.slug}`,
      });
    }

    const partnerId = "";

    await recordApplicationEvent({
      applicationId,
      programId: program.id,
      partnerId,
      eventName,
      req,
    });

    return NextResponse.json(
      { applicationId },
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

import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { createId } from "@/lib/api/create-id";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getIP } from "@/lib/api/utils/get-ip";
import { recordApplicationEvent } from "@/lib/application-tracker/record-application-event";
import { withAxiom } from "@/lib/axiom/server";
import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const trackApplicationSchema = z.object({
  eventName: z.enum(["visit", "started", "submitted"]),
  applicationId: z.string().optional(),
  referrerUsername: z.string().optional(),
  programId: z.string().optional(),
  programSlug: z.string().optional(),
  source: z.string().optional(),
});

const DUB_APPLICATION_ID_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

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

    const { eventName, applicationId, referrerUsername, programId, source } =
      trackApplicationSchema.parse(await parseRequestBody(req));

    const isVisit = eventName === "visit";

    if (!isVisit && !applicationId) {
      throw new DubApiError({
        code: "bad_request",
        message: "applicationId is required for started and submitted events",
      });
    }

    // Resolve partner ID from referrer username if provided
    let resolvedApplicationId = applicationId ?? null;
    let partnerId: string | null = null;

    if (referrerUsername) {
      const partner = await prisma.partner.findUnique({
        where: {
          username: referrerUsername,
        },
        select: {
          id: true,
        },
      });

      partnerId = partner?.id ?? null;
    }

    // If it's a visit event and no application ID is provided, generate a new one
    if (isVisit && !resolvedApplicationId) {
      resolvedApplicationId = createId({ prefix: "pga_" });
    }

    if (resolvedApplicationId) {
      await recordApplicationEvent({
        applicationId: resolvedApplicationId,
        partnerId,
        programId,
        eventName,
        source,
        req,
      });
    }

    const responseHeaders = new Headers(COMMON_CORS_HEADERS);

    // If it's a visit event and an application ID is generated, set the cookie
    if (isVisit && resolvedApplicationId) {
      const secure = process.env.NODE_ENV === "production";
      const cookieHeader = `dub_application_id=${resolvedApplicationId}; Path=/; Max-Age=${DUB_APPLICATION_ID_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;

      responseHeaders.append("Set-Cookie", cookieHeader);
    }

    return NextResponse.json(
      { applicationId: resolvedApplicationId },
      { status: 202, headers: responseHeaders },
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

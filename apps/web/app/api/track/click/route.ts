import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { clickCache } from "@/lib/api/links/click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkWithPartner } from "@/lib/planetscale/get-link-with-partner";
import { recordClick } from "@/lib/tinybird";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { isValidUrl, LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const trackClickSchema = z.object({
  domain: z.string({ required_error: "domain is required." }),
  key: z.string({ required_error: "key is required." }),
  url: z.string().nullish(),
  referrer: z.string().nullish(),
});

export const partnerDiscountSchema = z.object({
  clickId: z.string(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullish(),
  discount: DiscountSchema.pick({
    id: true,
    amount: true,
    type: true,
    maxDuration: true,
  }).nullish(),
});

// POST /api/track/click – Track a click event from the client-side
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { domain, key, url, referrer } = trackClickSchema.parse(
      await parseRequestBody(req),
    );

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    let clickId = await clickCache.get({
      domain,
      key,
      ip,
    });

    // if the clickId is already cached in Redis, return it
    if (clickId) {
      return NextResponse.json({ clickId }, { headers: CORS_HEADERS });
    }

    // Otherwise, track the click event
    const link = await getLinkWithPartner({
      domain,
      key,
    });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for domain: ${domain} and key: ${key}.`,
      });
    }

    verifyAnalyticsAllowedHostnames({
      allowedHostnames: link.allowedHostnames,
      req,
    });

    const finalUrl = url ? (isValidUrl(url) ? url : link.url) : link.url;
    clickId = nanoid(16);

    waitUntil(
      recordClick({
        req,
        clickId,
        linkId: link.id,
        domain,
        key,
        url: finalUrl,
        workspaceId: link.projectId,
        skipRatelimit: true,
        ...(referrer && { referrer }),
        trackConversion: link.trackConversion,
      }),
    );

    const response = partnerDiscountSchema.parse({
      clickId,
      ...(link.partner && { partner: link.partner }),
      ...(link.discount && { discount: link.discount }),
    });

    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
});

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

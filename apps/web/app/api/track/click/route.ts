import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { clickCache } from "@/lib/api/links/click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getWorkspaceViaEdge } from "@/lib/planetscale";
import { getLinkWithPartner } from "@/lib/planetscale/get-link-with-partner";
import { recordClick } from "@/lib/tinybird";
import { formatRedisLink } from "@/lib/upstash";
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

const trackClickResponseSchema = z.object({
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

    let [cachedClickId, cachedLink] = await Promise.all([
      clickCache.get({
        domain,
        key,
        ip,
      }),
      linkCache.get({
        domain,
        key,
      }),
    ]);

    // assign a new clickId if there's no cached clickId
    // else, reuse the cached clickId
    const clickId = cachedClickId ?? nanoid(16);

    if (!cachedLink) {
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

      cachedLink = formatRedisLink(link as any);

      waitUntil(linkCache.set(link as any));
    }

    if (!cachedLink.projectId) {
      throw new DubApiError({
        code: "not_found",
        message: "Link not found.",
      });
    }

    const finalUrl = url
      ? isValidUrl(url)
        ? url
        : cachedLink.url
      : cachedLink.url;

    // if there's no cached clickId, track the click event
    if (!cachedClickId) {
      waitUntil(
        (async () => {
          const workspace = await getWorkspaceViaEdge(cachedLink.projectId!);
          const allowedHostnames = workspace?.allowedHostnames as string[];

          if (
            verifyAnalyticsAllowedHostnames({
              allowedHostnames,
              req,
            })
          ) {
            await recordClick({
              req,
              clickId,
              linkId: cachedLink.id,
              domain,
              key,
              url: finalUrl,
              workspaceId: cachedLink.projectId,
              skipRatelimit: true,
              ...(referrer && { referrer }),
              trackConversion: cachedLink.trackConversion,
            });
          }
        })(),
      );
    }

    const isPartnerLink = Boolean(cachedLink.programId && cachedLink.partnerId);
    const { partner = null, discount = null } = cachedLink;

    const response = trackClickResponseSchema.parse({
      clickId,
      ...(isPartnerLink && {
        partner,
        discount,
      }),
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

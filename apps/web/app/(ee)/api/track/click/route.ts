import { allowedHostnamesCache } from "@/lib/analytics/allowed-hostnames-cache";
import {
  getHostnameFromRequest,
  verifyAnalyticsAllowedHostnames,
} from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { recordClickCache } from "@/lib/api/links/record-click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getWorkspaceViaEdge } from "@/lib/planetscale";
import { getLinkWithPartner } from "@/lib/planetscale/get-link-with-partner";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { isValidUrl, LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

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
    couponId: true,
    couponTestId: true,
  }).nullish(),
});

// POST /api/track/click – Track a click event for a link
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { domain, key, url, referrer } = trackClickSchema.parse(
      await parseRequestBody(req),
    );

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    let [cachedClickId, cachedLink, cachedAllowedHostnames] = await redis.mget<
      [string, RedisLinkProps, string[]]
    >([
      recordClickCache._createKey({ domain, key, ip }),
      linkCache._createKey({ domain, key }),
      allowedHostnamesCache._createKey({ domain }),
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
        message: "Link does not belong to a workspace.",
      });
    }

    const finalUrl = url
      ? isValidUrl(url)
        ? url
        : cachedLink.url
      : cachedLink.url;

    // if there's no cached clickId, track the click event
    if (!cachedClickId) {
      if (!cachedAllowedHostnames) {
        const workspace = await getWorkspaceViaEdge({
          workspaceId: cachedLink.projectId,
          includeDomains: true,
        });

        cachedAllowedHostnames = (workspace?.allowedHostnames ??
          []) as string[];

        waitUntil(
          allowedHostnamesCache.mset({
            allowedHostnames: JSON.stringify(cachedAllowedHostnames),
            domains: workspace?.domains.map(({ slug }) => slug) ?? [],
          }),
        );
      }

      const allowRequest = verifyAnalyticsAllowedHostnames({
        allowedHostnames: cachedAllowedHostnames,
        req,
      });

      if (!allowRequest) {
        throw new DubApiError({
          code: "forbidden",
          message: `Request origin '${getHostnameFromRequest(req)}' is not included in the allowed hostnames for this workspace. Update your allowed hostnames here: https://app.dub.co/settings/analytics`,
        });
      }

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
        shouldCacheClickId: true,
      });
    }

    const isPartnerLink = Boolean(cachedLink.programId && cachedLink.partnerId);
    const { partner = null, discount = null } = cachedLink;

    const response = trackClickResponseSchema.parse({
      clickId,
      ...(isPartnerLink && {
        partner,
        discount: discount
          ? {
              ...discount,
              // Support backwards compatibility with old cache format
              // We could potentially remove after 24 hours
              couponId: discount?.couponId ?? null,
              couponTestId: discount?.couponTestId ?? null,
            }
          : null,
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

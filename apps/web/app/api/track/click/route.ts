import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ExpandedLink } from "@/lib/api/links";
import { linkCache } from "@/lib/api/links/cache";
import { clickCache } from "@/lib/api/links/click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getIpAddress } from "@/lib/ip-address";
import { getLinkViaEdge } from "@/lib/planetscale";
import { getPartnerAndDiscount } from "@/lib/planetscale/get-partner-discount";
import { getWorkspaceViaEdge } from "@/lib/planetscale/get-workspace-via-edge";
import { recordClick } from "@/lib/tinybird";
import { formatRedisLink } from "@/lib/upstash/format-redis-link";
import { linkPartnerDiscountSchema } from "@/lib/zod/schemas/clicks";
import { isValidUrl, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const schema = z.object({
  domain: z.string(),
  key: z.string(),
  url: z.string().nullish(),
  referrer: z.string().nullish(),
});

// POST /api/track/click – Track a click event from the client-side
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const {
      domain,
      key,
      url = "",
      referrer = "",
    } = schema.parse(await parseRequestBody(req));

    let partner: ExpandedLink["partner"] | null;
    let discount: ExpandedLink["discount"] | null;
    let clickId = await clickCache.get({
      domain,
      key,
      ip: getIpAddress(req),
    });

    // only generate + record a new click ID if it's not already cached in Redis
    if (!clickId) {
      let cachedLink = await linkCache.get({
        domain,
        key,
      });

      if (!cachedLink) {
        let linkData = await getLinkViaEdge({
          domain,
          key,
        });

        if (!linkData || !linkData?.projectId) {
          throw new DubApiError({
            code: "not_found",
            message: `Link not found for domain: ${domain} and key: ${key}.`,
          });
        }

        if (linkData.partnerId && linkData.programId) {
          const response = await getPartnerAndDiscount({
            partnerId: linkData.partnerId,
            programId: linkData.programId,
          });

          linkData = {
            ...linkData,
            ...response,
          };
        }

        cachedLink = formatRedisLink(linkData as any);

        waitUntil(linkCache.set(linkData as any));
      }

      // Verify the referrer is allowed
      const workspace = await getWorkspaceViaEdge(cachedLink.projectId!, [
        "allowedHostnames",
      ]);

      if (workspace?.allowedHostnames) {
        verifyAnalyticsAllowedHostnames({
          allowedHostnames: workspace.allowedHostnames,
          req,
        });
      }

      const finalUrl = url
        ? isValidUrl(url)
          ? url
          : cachedLink.url
        : cachedLink.url;

      clickId = nanoid(16);
      partner = cachedLink.partner || null;
      discount = cachedLink.discount || null;

      waitUntil(
        Promise.all([
          recordClick({
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
            ...(partner && { partner }),
            ...(discount && { discount }),
          }),

          partner &&
            clickCache.setPartner(clickId, {
              partner,
              discount,
            }),
        ]),
      );
    } else {
      const partnerData = await clickCache.getPartner(clickId);

      if (partnerData) {
        partner = partnerData.partner;
        discount = partnerData.discount;
      }
    }

    return NextResponse.json(
      {
        clickId,
        ...linkPartnerDiscountSchema.parse({
          partner,
          discount,
        }),
      },
      {
        headers: CORS_HEADERS,
      },
    );
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

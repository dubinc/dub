import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { clickCache } from "@/lib/api/links/click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkWithAllowedHostnames } from "@/lib/planetscale/get-link-with-allowed-hostnames";
import { recordClick } from "@/lib/tinybird";
import { isValidUrl, LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/track/click – Track a click event from the client-side
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { domain, key, url, referrer } = await parseRequestBody(req);

    if (!domain || !key) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing domain or key",
      });
    }

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    let clickId = await clickCache.get({ domain, key, ip });

    // only generate + record a new click ID if it's not already cached in Redis
    if (!clickId) {
      clickId = nanoid(16);

      const link = await getLinkWithAllowedHostnames(domain, key);

      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: `Link not found for domain: ${domain} and key: ${key}.`,
        });
      }

      const allowedHostnames = link.allowedHostnames;
      verifyAnalyticsAllowedHostnames({ allowedHostnames, req });

      const finalUrl = isValidUrl(url) ? url : link.url;

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
    }

    return NextResponse.json(
      {
        clickId,
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

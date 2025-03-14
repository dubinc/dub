import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkWithAllowedHostnames } from "@/lib/planetscale/get-link-with-allowed-hostnames";
import { recordClick } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { isValidUrl, LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/track/visit – Track a visit event from the client-side
export const POST = async (req: Request) => {
  try {
    const { domain, key, clickId, url, referrer, conversion } = await parseRequestBody(req);

    if (!domain || !key || !clickId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing domain, key, or clickId",
      });
    }

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
        ...(referrer && { referrer }),
        ...(conversion && { conversion }),
        trackConversion: link.trackConversion,
      }),
    );

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: CORS_HEADERS,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
};

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

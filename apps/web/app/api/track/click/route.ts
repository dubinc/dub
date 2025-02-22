import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { conn } from "@/lib/planetscale/connection";
import { recordClick } from "@/lib/tinybird";
import { ratelimit, redis } from "@/lib/upstash";
import { isValidUrl, LOCALHOST_IP, nanoid, punyEncode } from "@dub/utils";
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
export const POST = withAxiom(
  async (req: AxiomRequest) => {
    try {
      const { domain, key, url } = await parseRequestBody(req);

      if (!domain || !key) {
        throw new DubApiError({
          code: "bad_request",
          message: "Missing domain or key",
        });
      }

      const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

      const { success } = await ratelimit().limit(
        `track-click:${domain}-${key}:${ip}`,
      );

      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message: "Don't DDoS me pls 🥺",
        });
      }

      // might wanna cache this
      const { rows } = await conn.execute<{
        id: string;
        url: string;
        projectId: string;
        allowedHostnames: string[];
      }>(
        "SELECT Link.id, Link.url, projectId, allowedHostnames FROM Link LEFT JOIN Project ON Link.projectId = Project.id WHERE domain = ? AND `key` = ?",
        [domain, punyEncode(decodeURIComponent(key))],
      );

      const link =
        rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: `Link not found for domain: ${domain} and key: ${key}.`,
        });
      }

      const allowedHostnames = link.allowedHostnames;
      verifyAnalyticsAllowedHostnames({ allowedHostnames, req });

      const cacheKey = `recordClick:${link.id}:${ip}`;
      let clickId = await redis.get<string>(cacheKey);

      if (!clickId) {
        clickId = nanoid(16);
        const finalUrl = isValidUrl(url) ? url : link.url;

        waitUntil(
          recordClick({
            req,
            clickId,
            linkId: link.id,
            url: finalUrl,
            skipRatelimit: true,
            workspaceId: link.projectId,
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
  },
  {
    logRequestDetails: ["body", "nextUrl"],
  },
);

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

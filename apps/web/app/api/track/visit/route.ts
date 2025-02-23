import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { getLinkWithAllowedHostnames } from "@/lib/planetscale/get-link-with-allowed-hostnames";
import { recordClick, recordLink } from "@/lib/tinybird";
import { ratelimit, redis } from "@/lib/upstash";
import { prismaEdge } from "@dub/prisma/edge";
import {
  isValidUrl,
  linkConstructorSimple,
  LOCALHOST_IP,
  nanoid,
} from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/track/visit – Track a visit event from the client-side
export const POST = withAxiom(
  async (req: AxiomRequest) => {
    try {
      const { domain, url, referrer } = await parseRequestBody(req);

      if (!domain || !url) {
        throw new DubApiError({
          code: "bad_request",
          message: "Missing domain or url",
        });
      }

      const urlObj = new URL(url);

      let linkKey = urlObj.pathname.slice(1);
      if (linkKey === "") {
        linkKey = "_root";
      }

      const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

      const { success } = await ratelimit().limit(
        `track-click:${domain}-${linkKey}:${ip}`,
      );

      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message: "Don't DDoS me pls 🥺",
        });
      }

      let link = await getLinkWithAllowedHostnames(domain, linkKey);

      if (!link) {
        // get root domain link
        const rootDomainLink = await getLinkWithAllowedHostnames(
          domain,
          "_root",
        );

        if (!rootDomainLink) {
          throw new DubApiError({
            code: "not_found",
            message: "siteDomain not found – have you created it on Dub yet?",
          });
        }

        const newLink = await prismaEdge.link.create({
          data: {
            id: createId("link_"),
            domain,
            key: linkKey,
            url,
            shortLink: linkConstructorSimple({ domain, key: linkKey }),
            trackConversion: true,
            projectId: rootDomainLink.projectId,
            folderId: rootDomainLink.folderId,
            userId: rootDomainLink.userId,
          },
          include: includeTags,
        });
        waitUntil(
          Promise.allSettled([linkCache.set(newLink), recordLink(newLink)]),
        );

        link = {
          ...newLink,
          projectId: rootDomainLink.projectId,
          folderId: rootDomainLink.folderId,
          userId: rootDomainLink.userId,
          allowedHostnames: rootDomainLink.allowedHostnames,
        };
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
            ...(referrer && { referrer }),
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

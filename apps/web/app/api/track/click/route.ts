import { verifyAnalyticsAllowedHostnames } from "@/lib/analytics/verify-analytics-allowed-hostnames";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { clickCache } from "@/lib/api/links/click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import {
  getLinkWithAllowedHostnames,
  LinkWithAllowedHostnames,
} from "@/lib/planetscale/get-link-with-allowed-hostnames";
import { recordClick } from "@/lib/tinybird";
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

const schema = z.union(
  [
    // domain and key
    z.object({
      domain: z.string(),
      key: z.string(),
      url: z.string().optional(),
      referrer: z.string().optional(),
    }),

    // linkId
    z.object({
      linkId: z.string(),
      url: z.string().optional(),
      referrer: z.string().optional(),
    }),

    // externalId and workspaceId
    z.object({
      externalId: z.string(),
      workspaceId: z.string(),
      url: z.string().optional(),
      referrer: z.string().optional(),
    }),
  ],
  {
    errorMap: (issue, ctx) => {
      if (issue.code === "invalid_union") {
        return {
          message:
            "You must provide either: (domain and key), linkId, or (externalId and workspaceId).",
        };
      }

      return {
        message: ctx.defaultError,
      };
    },
  },
);

// POST /api/track/click – Track a click event from the client-side
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const body = schema.parse(await parseRequestBody(req));

    const { url, referrer } = body;
    let link: LinkWithAllowedHostnames | null = null;
    let domain: string | null = null;
    let key: string | null = null;

    // by linkId
    if ("linkId" in body) {
      link = await getLinkWithAllowedHostnames({
        linkId: body.linkId,
      });

      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: `Link not found for linkId: ${body.linkId}.`,
        });
      }
    }

    // by externalId and workspaceId
    else if ("externalId" in body && "workspaceId" in body) {
      link = await getLinkWithAllowedHostnames({
        externalId: body.externalId,
        workspaceId: body.workspaceId,
      });

      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: `Link not found for externalId: ${body.externalId}.`,
        });
      }
    }

    if (link) {
      domain = link.domain;
      key = link.key;
    } else if ("domain" in body && "key" in body) {
      domain = body.domain;
      key = body.key;
    }

    if (!domain || !key) {
      throw new Error("Bad request.");
    }

    let clickId = await clickCache.get({
      domain: domain!,
      key: key!,
      ip: process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP,
    });

    // only generate + record a new click ID if it's not already cached in Redis
    if (!clickId) {
      clickId = nanoid(16);

      if (!link) {
        link = await getLinkWithAllowedHostnames({
          domain,
          key,
        });
      }

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

      waitUntil(
        recordClick({
          req,
          clickId,
          linkId: link.id,
          domain,
          key,
          url: isValidUrl(url) ? url : link.url,
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

import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { recordClickCache } from "@/lib/api/links/record-click-cache";
import { parseRequestBody } from "@/lib/api/utils";
import { getIdentityHash } from "@/lib/middleware/utils";
import { IdentityHashClicksData } from "@/lib/middleware/utils/cache-identity-hash-clicks";
import { getLinkViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { parseUrlSchema } from "@/lib/zod/schemas/utils";
import { LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const trackOpenRequestSchema = z
  .object({
    deepLink: parseUrlSchema.optional(),
    dubDomain: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.deepLink && !data.dubDomain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "You need to provide either `deepLink` or `dubDomain` for deferred deep linking.",
      });
    }
  });

const trackOpenResponseSchema = z.object({
  clickId: z.string().nullable(),
  link: z
    .object({
      id: z.string(),
      domain: z.string(),
      key: z.string(),
      url: z.string(),
    })
    .nullable(),
});

// POST /api/track/open – Track an open event for deep link
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const { deepLink: deepLinkUrl, dubDomain } = trackOpenRequestSchema.parse(
      await parseRequestBody(req),
    );

    if (!deepLinkUrl) {
      const identityHash = await getIdentityHash(req);

      // Get all iOS click cache keys for this identity hash
      const [_, cacheKeysForDomain] = await redis.scan(0, {
        match: `iosClickCache:${identityHash}:${dubDomain}:*`,
        count: 10,
      });

      if (cacheKeysForDomain.length > 0) {
        const cachedData = await redis.get<IdentityHashClicksData>(
          cacheKeysForDomain[0],
        );

        if (cachedData) {
          return NextResponse.json(trackOpenResponseSchema.parse(cachedData), {
            headers: CORS_HEADERS,
          });
        }
      }

      return NextResponse.json(
        trackOpenResponseSchema.parse({
          clickId: null,
          link: null,
        }),
        { headers: CORS_HEADERS },
      );
    }

    const deepLink = new URL(deepLinkUrl);

    const domain = deepLink.hostname.replace(/^www\./, "").toLowerCase();
    const key = deepLink.pathname.slice(1) || "_root"; // Remove leading slash, default to _root if empty

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    let [cachedClickId, cachedLink] = await redis.mget<
      [string, RedisLinkProps, string[]]
    >([
      recordClickCache._createKey({ domain, key, ip }),
      linkCache._createKey({ domain, key }),
    ]);

    // assign a new clickId if there's no cached clickId
    // else, reuse the cached clickId
    const clickId = cachedClickId ?? nanoid(16);

    if (!cachedLink) {
      const link = await getLinkViaEdge({
        domain,
        key,
      });

      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: `Deep link not found: ${deepLink}`,
        });
      }

      cachedLink = formatRedisLink(link as any);

      waitUntil(linkCache.set(link as any));
    }

    if (!cachedLink.projectId) {
      throw new DubApiError({
        code: "not_found",
        message: "Deep link does not belong to a workspace.",
      });
    }

    // if there's no cached clickId, track the click event
    if (!cachedClickId) {
      await recordClick({
        req,
        clickId,
        linkId: cachedLink.id,
        domain,
        key,
        url: cachedLink.url,
        workspaceId: cachedLink.projectId,
        skipRatelimit: true,
        shouldCacheClickId: true,
        trigger: "deeplink",
      });
    }

    const response = trackOpenResponseSchema.parse({
      clickId,
      link: {
        id: cachedLink.id,
        domain,
        key,
        url: cachedLink.url,
      },
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

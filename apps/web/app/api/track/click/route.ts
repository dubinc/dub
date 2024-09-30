import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getLinkViaEdge } from "@/lib/planetscale";
import { recordClick } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/click – Track a click event
export const POST = async (req: Request) => {
  const { domain, identifier } = await parseRequestBody(req);

  const link = await getLinkViaEdge(domain, identifier);

  if (
    !link
    // || link.projectId !== workspace.id
  ) {
    throw new DubApiError({
      code: "not_found",
      message: `Link not found for identifier: ${identifier}`,
    });
  }

  const redisKey = `recordClick:${link.id}:${ipAddress(req)}`;
  let clickId = await redis.get<string>(redisKey);
  if (!clickId) {
    clickId = nanoid(16);

    waitUntil(
      Promise.allSettled([
        redis.set(redisKey, clickId, {
          ex: 60 * 60,
        }), // 1 hour
        recordClick({
          req,
          clickId,
          linkId: link.id,
          url: link.url,
          skipRatelimit: true,
        }),
      ]),
    );
  }

  return NextResponse.json({
    clickId,
  });
};

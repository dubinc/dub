import { withSessionEdge } from "@/lib/auth/session-edge";
import { recordClick } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextResponse } from "next/server";

import { generateClickId } from "@/lib/analytics";
import { parseUrl } from "@/lib/middleware/utils";
import { getAffiliateViaEdge, getLinkViaEdgeByURL } from "@/lib/planetscale";
import { z } from "zod";

export const runtime = "edge";

const clickEventSchema = z.object({
  url: z.string().url(),
  affiliateParamKey: z.string().optional(),
});

// POST /api/track/click – post click event
export const POST = withSessionEdge(async ({ req }) => {
  const body = clickEventSchema.parse(await req.json());
  const { url, affiliateParamKey } = body;
  const { domain, key, searchParams } = parseUrl(url);

  const clickId = generateClickId();

  waitUntil(async () => {
    let affiliateUsername;
    let link;

    if (affiliateParamKey && url.includes(`${affiliateParamKey}=`)) {
      link = await getLinkViaEdgeByURL(url);
      affiliateUsername = searchParams.get(affiliateParamKey);
    } else {
      link = await redis.hget<RedisLinkProps>(domain, key);
      affiliateUsername = key;
    }
    if (!link) {
      return NextResponse.json("Link not found", { status: 404 });
    }
    const affiliate = await getAffiliateViaEdge(
      link.project_id,
      affiliateUsername,
    );
    const affiliateId = affiliate?.id;

    await recordClick({
      req,
      id: link!.id,
      url,
      clickId,
      affiliateId,
    });
  });

  return NextResponse.json({
    success: true,
    clickId,
  });
});

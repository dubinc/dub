import { recordClick } from "@/lib/tinybird";
import { NextResponse } from "next/server";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { withAuthEdge } from "@/lib/auth-edge";
import { redis } from "@/lib/upstash";
import { RedisLinkProps } from "@/lib/types";
import { parseUrl } from "@/lib/middleware/utils";
import { z } from 'zod';
import { getAffiliateViaEdge, getLinkViaEdgeByURL } from "@/lib/planetscale";
import { generateClickId } from "@/lib/analytics";

// export const runtime = "edge";

const clickEventSchema = z.object({
  url: z.string().url(),
  affiliateParamKey: z.string().optional(),
});

// POST /api/track/click – post click event
export const POST = withAuthEdge(async ({ req }) => {
  try {

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
        affiliateUsername = key
      }
      if (!link) {
        return NextResponse.json("Link not found", { status: 404 });
      }
      const affiliate = await getAffiliateViaEdge(link.project_id, affiliateUsername);
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
  } catch (e) {
    // TODO: update with handleAndReturnErrorResponse
    return NextResponse.json({
      success: false,
      error: e.message,
    }, { status: 400 });
  }
});

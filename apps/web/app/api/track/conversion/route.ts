import { recordConversion } from "@/lib/tinybird";
import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { getAffiliateViaEdge } from "@/lib/planetscale";

export const runtime = "edge";

const ConversionEventSchema = z.object({
  eventName: z.string(),
  properties: z.record(z.unknown()),
  clickId: z.string(),
  affiliateUsername: z.string().optional(),
});

// POST /api/track/conversion – post conversion event
export const POST = async (req: NextRequest) => {
  const body = ConversionEventSchema.parse(await req.json());
  const { eventName, properties, clickId, affiliateUsername } = body;

  let affiliateId;
  if (affiliateUsername) {
    const affiliate = await getAffiliateViaEdge('link.project_id', affiliateUsername);
    affiliateId = affiliate?.id;
  }

  waitUntil(async () => {
    await recordConversion({
      eventName,
      properties,
      clickId,
      affiliateId,
    });
  });
  
  return NextResponse.json({
    success: true,
  });
};

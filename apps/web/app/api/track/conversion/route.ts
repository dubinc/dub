import { withSessionEdge } from "@/lib/auth/session-edge";
import { getAffiliateViaEdge } from "@/lib/planetscale";
import { recordConversion } from "@/lib/tinybird";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const conversionEventSchema = z.object({
  eventName: z.string(),
  properties: z.record(z.unknown()),
  clickId: z.string(),
  affiliateUsername: z.string().optional(),
});

// POST /api/track/conversion – post conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionEventSchema.parse(await req.json());
  const { eventName, properties, clickId, affiliateUsername } = body;

  waitUntil(async () => {
    let affiliateId;
    if (affiliateUsername) {
      const affiliate = await getAffiliateViaEdge(
        "link.project_id",
        affiliateUsername,
      );
      affiliateId = affiliate?.id;
    }

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
});

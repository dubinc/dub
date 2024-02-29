import { recordConversion } from "@/lib/tinybird";
import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";

export const runtime = "edge";

const ConversionEventSchema = z.object({
  event_name: z.string(),
  properties: z.record(z.unknown()),
  click_id: z.string(),
});

// POST /api/track/conversion – post conversion event
export const POST = async (req: NextRequest) => {
  const body = ConversionEventSchema.parse(await req.json());
  const { event_name, properties, click_id } = body;

  waitUntil(async () => {
    await recordConversion({
      eventName: event_name,
      properties: properties,
      clickId: click_id,
    });
  });
  
  return NextResponse.json({
    success: true,
  });
};

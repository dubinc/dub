import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getClickEvent, recordConversion } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track – Post a conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionRequestSchema.parse(await parseRequestBody(req));
  const { clickId, eventName, eventType, eventMetadata, customerId } = body;

  waitUntil(
    (async () => {
      const clickEvent = await getClickEvent({ clickId });

      if (!clickEvent || clickEvent.data.length === 0) {
        return;
      }

      await recordConversion({
        ...clickEvent.data[0],
        event_name: eventName,
        event_type: eventType,
        event_metadata: eventMetadata,
        customer_id: customerId,
        timestamp: new Date(Date.now()).toISOString(),
      });
    })(),
  );

  return NextResponse.json({ success: true });
});

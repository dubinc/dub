import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getClickEvent, recordConversion } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track – Track a click conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionRequestSchema.parse(await parseRequestBody(req));
  const { clickId, eventName, eventType, metadata, customerId } = body;

  waitUntil(
    (async () => {
      const clickEvent = await getClickEvent({ clickId });

      if (!clickEvent || clickEvent.data.length === 0) {
        return;
      }

      await recordConversion({
        ...clickEvent.data[0],
        timestamp: new Date(Date.now()).toISOString(),
        event_id: nanoid(16),
        event_name: eventName,
        event_type: eventType,
        metadata,
        customer_id: customerId,
      });
    })(),
  );

  return NextResponse.json({ success: true });
});

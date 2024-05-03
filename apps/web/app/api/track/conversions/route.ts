import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/edge";
import { getClickEvent, recordConversion } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/conversions – Post a conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionRequestSchema.parse(await parseRequestBody(req));
  const { clickId, eventName, eventType, metadata, customerId } = body;

  waitUntil(async () => {
    const clickEvent = await getClickEvent(clickId);

    if (!clickEvent) {
      return;
      // return NextResponse.json({ success: false }, { status: 404 });
    }

    await recordConversion({
      ...clickEvent,
      metadata,
      event_name: eventName,
      event_type: eventType,
    });
  });

  return NextResponse.json({ success: true });
});

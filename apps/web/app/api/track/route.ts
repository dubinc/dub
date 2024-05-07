import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getClickEvent } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/conversions – Post a conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionRequestSchema.parse(await parseRequestBody(req));
  const { clickId, eventName, eventType, metadata, customerId } = body;

  waitUntil(async () => {
    const clickEvent = await getClickEvent({ clickId });

    if (!clickEvent || clickEvent.data.length === 0) {
      return;
    }

    console.log("clickEvent", clickEvent.data[0]);

    // await recordConversion({
    //   ...clickEvent.data[0],
    //   metadata,
    //   event_name: eventName,
    //   event_type: eventType,
    // });
  });

  return NextResponse.json({ success: true });
});

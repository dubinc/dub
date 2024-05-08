import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getClickEvent, recordConversion } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track – Post a conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionRequestSchema.parse(await parseRequestBody(req));
  const { clickId, name, event, metadata, customerKey } = body;

  waitUntil(async () => {
    const clickEvent = await getClickEvent({ clickId });

    if (!clickEvent || clickEvent.data.length === 0) {
      return;
    }

    console.log("body", body);

    await recordConversion({
      ...clickEvent.data[0],
      metadata,
      customer_key: customerKey,
      event_name: name,
      event_type: event,
      timestamp: new Date(Date.now()).toISOString(),
    });
  });

  return NextResponse.json({ success: true });
});

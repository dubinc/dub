import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth";
import { getClickEvent, recordConversion } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { NextResponse } from "next/server";

// export const runtime = "edge";

// TODO:
// Support Edge and waitUntil
// Replace withWorkspace

// POST /api/track/conversions – post conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = await parseRequestBody(req);
  const parsed = conversionRequestSchema.parse(body);

  const { clickId, eventName, eventType, metadata, customerId } = parsed;

  const clickEvent = await getClickEvent(clickId);

  if (!clickEvent) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  await recordConversion({
    ...clickEvent,
    eventName,
    eventType,
    metadata,
    customerId,
  });

  return NextResponse.json({ success: true });
});

import { recordTrack } from "@/lib/tinybird";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/conversion – post conversion event
export const POST = async (req: NextRequest) => {
  // Add Auth to check API key to make sure it's a valid project on Dub

  // zod for body validation
  const body = req.json();
  // @ts-expect-error
  const { event_name, properties, click_id } = body;

  const response = await recordTrack({
    eventName: event_name,
    properties: properties,
    clickId: click_id,
  });
  return NextResponse.json(response);
};

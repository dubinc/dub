import { withAuth } from "@/lib/auth";
import { recordTrack } from "@/lib/tinybird";
import { NextResponse } from "next/server";

// POST /api/analytics/track – post track event
export const POST = withAuth(
  async ({ req }) => {
    const body = req.json();
    // @ts-expect-error
    const { event_name, properties, click_id } = body;

    const response = await recordTrack({
      eventName: event_name,
      properties: properties,
      clickId: click_id,
    });
    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);

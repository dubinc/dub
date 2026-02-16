import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPostbackEvents } from "@/lib/postback/api/get-postback-events";
import { NextResponse } from "next/server";

// GET /api/partner-profile/postbacks/[postbackId]/events
export const GET = withPartnerProfile(
  async ({ partner, params }) => {
    const { postbackId } = params;

    await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    const events = await getPostbackEvents({
      postbackId,
    });

    const parsedEvents = events.data.map((event) => ({
      ...event,
      request_body: JSON.parse(event.request_body),
    }));

    return NextResponse.json(parsedEvents);
  },
  {
    requiredPermission: "postbacks.read",
  },
);

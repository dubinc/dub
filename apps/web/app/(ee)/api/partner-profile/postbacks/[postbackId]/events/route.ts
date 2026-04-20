import { withPartnerProfile } from "@/lib/auth/partner";
import { getPostbackEvents } from "@/lib/postback/api/get-postback-events";
import { getPostbackOrThrow } from "@/lib/postback/api/get-postback-or-throw";
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

    return NextResponse.json(events.data);
  },
  {
    requiredPermission: "postbacks.read",
    featureFlag: "postbacks",
  },
);

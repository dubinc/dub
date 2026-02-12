import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerPostbackEvents } from "@/lib/tinybird/get-partner-postback-events";
import { NextResponse } from "next/server";

// GET /api/partner-profile/postbacks/[postbackId]/events
export const GET = withPartnerProfile(
  async ({ partner, params }) => {
    const { postbackId } = params;

    await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    const events = await getPartnerPostbackEvents({
      postbackId,
    });

    return NextResponse.json({});
  },
  {
    requiredPermission: "postbacks.read",
  },
);

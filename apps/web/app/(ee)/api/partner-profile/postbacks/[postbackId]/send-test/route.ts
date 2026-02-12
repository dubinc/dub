import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

// POST /api/partner-profile/postbacks/[postbackId]/send-test
export const POST = withPartnerProfile(
  async ({ partner, params }) => {
    const { postbackId } = params;

    await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    return NextResponse.json({});
  },
  {
    requiredPermission: "postbacks.write",
  },
);

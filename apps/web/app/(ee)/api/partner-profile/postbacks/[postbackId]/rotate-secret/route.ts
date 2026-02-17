import { createToken } from "@/lib/api/oauth/utils";
import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  POSTBACK_SECRET_LENGTH,
  POSTBACK_SECRET_PREFIX,
} from "@/lib/postback/constants";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/partner-profile/postbacks/[postbackId]/rotate-secret
export const POST = withPartnerProfile(
  async ({ partner, params }) => {
    const { postbackId } = params;

    await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    const secret = createToken({
      prefix: POSTBACK_SECRET_PREFIX,
      length: POSTBACK_SECRET_LENGTH,
    });

    await prisma.partnerPostback.update({
      where: {
        id: postbackId,
      },
      data: {
        secret,
      },
    });

    return NextResponse.json({ secret });
  },
  {
    requiredPermission: "postbacks.write",
  },
);

import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { postbackSchema, updatePostbackSchema } from "@/lib/postback/schemas";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/partner-profile/postbacks/[postbackId]
export const PATCH = withPartnerProfile(
  async ({ partner, params, req }) => {
    const { postbackId } = params;

    let postback = await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    const { url, triggers, disabled } = updatePostbackSchema.parse(
      await parseRequestBody(req),
    );

    postback = await prisma.partnerPostback.update({
      where: {
        id: postbackId,
      },
      data: {
        ...(url !== undefined && { url }),
        ...(triggers !== undefined && { triggers }),
        ...(disabled !== undefined && {
          disabledAt: disabled ? new Date() : null,
        }),
      },
    });

    return NextResponse.json(postbackSchema.parse(postback));
  },
  {
    requiredPermission: "postbacks.write",
  },
);

// DELETE /api/partner-profile/postbacks/[postbackId]
export const DELETE = withPartnerProfile(
  async ({ partner, params }) => {
    const { postbackId } = params;

    await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    await prisma.partnerPostback.delete({
      where: {
        id: postbackId,
      },
    });

    return NextResponse.json({ id: postbackId });
  },
  {
    requiredPermission: "postbacks.write",
  },
);

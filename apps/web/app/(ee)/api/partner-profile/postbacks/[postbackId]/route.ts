import { getPostbackOrThrow } from "@/lib/api/postbacks/get-postback-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  partnerPostbackSchema,
  updatePartnerPostbackInputSchema,
} from "@/lib/postback/schemas";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/postbacks/[postbackId]
export const GET = withPartnerProfile(
  async ({ partner, params }) => {
    const { postbackId } = params;

    const postback = await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    return NextResponse.json(partnerPostbackSchema.parse(postback));
  },
  {
    requiredPermission: "postbacks.read",
    featureFlag: "postbacks",
  },
);

// PATCH /api/partner-profile/postbacks/[postbackId]
export const PATCH = withPartnerProfile(
  async ({ partner, params, req }) => {
    const { postbackId } = params;

    let postback = await getPostbackOrThrow({
      postbackId,
      partnerId: partner.id,
    });

    const { name, url, triggers, disabled } =
      updatePartnerPostbackInputSchema.parse(await parseRequestBody(req));

    postback = await prisma.partnerPostback.update({
      where: {
        id: postbackId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(triggers !== undefined && { triggers }),
        ...(disabled !== undefined && {
          disabledAt: disabled ? new Date() : null,
        }),
      },
    });

    return NextResponse.json(partnerPostbackSchema.parse(postback));
  },
  {
    requiredPermission: "postbacks.write",
    featureFlag: "postbacks",
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
    featureFlag: "postbacks",
  },
);

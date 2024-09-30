import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  REFERRAL_PUBLIC_TOKEN_EXPIRY,
  REFERRAL_PUBLIC_TOKEN_LENGTH,
} from "@/lib/referrals/constants";
import {
  createReferralTokenSchema,
  referralTokenSchema,
} from "@/lib/zod/schemas/referrals";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/referrals/tokens - create a new referral token for the given link
export const POST = withWorkspace(async ({ workspace, req }) => {
  const { linkId } = createReferralTokenSchema.parse(
    await parseRequestBody(req),
  );

  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
      projectId: workspace.id,
    },
  });

  if (!link.trackConversion) {
    throw new DubApiError({
      code: "forbidden",
      message: "Conversion tracking is not enabled for this link.",
    });
  }

  const referralToken = await prisma.referralPublicToken.create({
    data: {
      linkId,
      expires: new Date(Date.now() + REFERRAL_PUBLIC_TOKEN_EXPIRY),
      publicToken: nanoid(REFERRAL_PUBLIC_TOKEN_LENGTH),
    },
  });

  return NextResponse.json(referralTokenSchema.parse(referralToken), {
    status: 201,
  });
});

import { DubApiError } from "@/lib/api/errors";
import { sendVerificationToken } from "@/lib/dots/send-verification-token";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import z from "@/lib/zod";
import { parseRequestBody } from "@/lib/api/utils";
import { verifyToken } from "@/lib/dots/verify-token";

const verifyTokenSchema = z.object({
  otp: z.string(),
});

// POST /api/affiliates/flows/[token]/verify - verify the otp
export const POST = async (
  req: NextRequest,
  { params }: { params: { token: string } },
) => {
  const { token } = params;

  const affiliateToken = await prisma.affiliateToken.findUnique({
    where: {
      token,
    },
  });

  if (!affiliateToken) {
    throw new DubApiError({
      code: "not_found",
      message: `Affiliate token not found. Please create a new one.`,
    });
  }

  if (affiliateToken.expiresAt < new Date()) {
    throw new DubApiError({
      code: "bad_request",
      message: `Affiliate token expired. Please create a new one.`,
    });
  }

  const affiliate = await prisma.affiliate.findUniqueOrThrow({
    where: {
      id: affiliateToken.affiliateId,
    },
    select: {
      dotsUserId: true,
    },
  });

  if (!affiliate.dotsUserId) {
    throw new DubApiError({
      code: "bad_request",
      message: `Affiliate does not have a Dots user ID.`, // TODO: Better error message
    });
  }

  const { otp } = verifyTokenSchema.parse(await parseRequestBody(req));

  await verifyToken({
    dotsUserId: affiliate.dotsUserId,
    token: otp,
  });

  // TODO
  // Handle the case where the token is invalid

  return NextResponse.json({ status: "OK" });
};

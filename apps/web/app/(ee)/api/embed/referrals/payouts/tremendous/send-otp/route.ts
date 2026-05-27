import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { generateOTP } from "@/lib/auth";
import { EMAIL_OTP_EXPIRY_IN } from "@/lib/auth/constants";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { ratelimit } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import VerifyEmail from "@dub/email/templates/verify-email";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const sendOtpSchema = z.object({
  email: emailSchema,
});

// TODO:
// Audit log the email change for this partner
// Also record the events to Axiom

// POST /api/embed/referrals/payouts/tremendous/send-otp
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment }) => {
    const { email } = sendOtpSchema.parse(await parseRequestBody(req));
    const { partnerId } = programEnrollment;

    const { success } = await ratelimit(10, "24 h").limit(
      `tremendous-send-otp:${partnerId}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
      });
    }

    const [partner, duplicatePartner] = await prisma.$transaction([
      prisma.partner.findUniqueOrThrow({
        where: {
          id: partnerId,
        },
        select: {
          id: true,
          defaultPayoutMethod: true,
        },
      }),

      prisma.partner.findFirst({
        where: {
          tremendousEmail: email,
          id: {
            not: partnerId,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (partner.defaultPayoutMethod) {
      throw new DubApiError({
        code: "bad_request",
        message: "You already have a payout method connected.",
      });
    }

    if (duplicatePartner) {
      throw new DubApiError({
        code: "conflict",
        message:
          "Unable to save partner details. Please verify the email address and try again.",
      });
    }

    const code = generateOTP();
    const identifier = `tremendous:${partnerId}:${email}`;

    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({
        where: {
          identifier,
        },
      }),

      prisma.emailVerificationToken.create({
        data: {
          identifier,
          token: code,
          expires: new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000), // 15 minutes,
        },
      }),
    ]);

    await sendEmail({
      subject: "OTP to verify your payout email",
      to: email,
      react: VerifyEmail({
        email,
        code,
      }),
    });

    return NextResponse.json({ success: true });
  },
);

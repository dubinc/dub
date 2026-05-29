import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { TREMENDOUS_ENABLED_PROGRAM_IDS } from "@/lib/tremendous/constants";
import { ratelimit } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().min(6, "OTP must be 6 characters long.").max(6),
});

// POST /api/embed/referrals/tremendous/verify-otp
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment }) => {
    if (!TREMENDOUS_ENABLED_PROGRAM_IDS.includes(programEnrollment.programId)) {
      throw new DubApiError({
        code: "forbidden",
        message: "Gift card payouts are not available for this program.",
      });
    }

    const { email, code } = verifyOtpSchema.parse(await parseRequestBody(req));
    const { partnerId } = programEnrollment;

    const { success } = await ratelimit(10, "24 h").limit(
      `tremendous-verify-otp:${partnerId}`,
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

    const identifier = `tremendous:${partnerId}:${email}`;

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token: code,
        },
      },
    });

    if (!verificationToken) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "The verification code is incorrect or has expired. Please request a new code and try again.",
      });
    }

    if (verificationToken.expires < new Date()) {
      waitUntil(
        prisma.emailVerificationToken.delete({
          where: {
            identifier_token: {
              identifier,
              token: code,
            },
          },
        }),
      );

      throw new DubApiError({
        code: "bad_request",
        message:
          "The verification code is incorrect or has expired. Please request a new code and try again.",
      });
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.delete({
        where: {
          identifier_token: {
            identifier,
            token: code,
          },
        },
      }),

      prisma.partner.update({
        where: {
          id: partner.id,
          defaultPayoutMethod: null,
          payoutsEnabledAt: null,
        },
        data: {
          tremendousEmail: email,
          defaultPayoutMethod: "tremendous",
          payoutsEnabledAt: new Date(),
        },
      }),
    ]);

    // TODO:
    // Send confirmation email to the partner

    return NextResponse.json({ success: true });
  },
);

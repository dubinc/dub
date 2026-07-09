import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { extractEmailDomain } from "@/lib/email/extract-email-domain";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { prisma } from "@/lib/prisma";
import {
  TREMENDOUS_ENABLED_PROGRAM_IDS,
  TREMENDOUS_PROHIBITED_TOP_LEVEL_DOMAINS,
} from "@/lib/tremendous/constants";
import { ratelimit, redis } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { TREMENDOUS_SUPPORTED_COUNTRIES } from "@dub/utils";
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

    const emailDomain = extractEmailDomain(email)!;

    // Check if the email domain is allowed by Tremendous
    const isProhibited = TREMENDOUS_PROHIBITED_TOP_LEVEL_DOMAINS.some((tld) =>
      emailDomain.endsWith(tld),
    );

    if (isProhibited) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "This email address isn't eligible for gift card payouts. Please use a different email address.",
      });
    }

    const [isDisposableEmailDomain, isTremendousProhibited] = await Promise.all(
      [
        redis.sismember("disposableEmailDomains", emailDomain),
        redis.sismember("tremendousProhibitedEmailDomains", emailDomain),
      ],
    );

    if (isDisposableEmailDomain || isTremendousProhibited) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "This email address isn't eligible for gift card payouts. Please use a different email address.",
      });
    }

    const partner = await prisma.partner.findUniqueOrThrow({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        country: true,
        defaultPayoutMethod: true,
      },
    });

    if (
      partner.country &&
      !TREMENDOUS_SUPPORTED_COUNTRIES.includes(partner.country)
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "Gift card payouts are not available in your country.",
      });
    }

    if (partner.defaultPayoutMethod) {
      throw new DubApiError({
        code: "bad_request",
        message: "You already have a payout method connected.",
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

    try {
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
    } catch (error) {
      if (error.code === "P2025") {
        throw new DubApiError({
          code: "bad_request",
          message: "You already have a payout method connected.",
        });
      }

      throw error;
    }

    return NextResponse.json({ success: true });
  },
);

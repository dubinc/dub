import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { generateOTP } from "@/lib/auth";
import { EMAIL_OTP_EXPIRY_IN } from "@/lib/auth/constants";
import { extractEmailDomain } from "@/lib/email/extract-email-domain";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { prisma } from "@/lib/prisma";
import {
  TREMENDOUS_ENABLED_PROGRAM_IDS,
  TREMENDOUS_PROHIBITED_TOP_LEVEL_DOMAINS,
} from "@/lib/tremendous/constants";
import { ratelimit, redis } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import PartnerTremendousVerifyEmail from "@dub/email/templates/partner-tremendous-verify-email";
import { TREMENDOUS_SUPPORTED_COUNTRIES } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const sendOtpSchema = z.object({
  email: emailSchema,
});

// POST /api/embed/referrals/tremendous/send-otp
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment }) => {
    if (!TREMENDOUS_ENABLED_PROGRAM_IDS.includes(programEnrollment.programId)) {
      throw new DubApiError({
        code: "forbidden",
        message: "Gift card payouts are not available for this program.",
      });
    }

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
          expires: new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000), // 5 minutes
        },
      }),
    ]);

    await sendEmail({
      subject: "OTP to verify your payout email",
      to: email,
      react: PartnerTremendousVerifyEmail({
        email,
        code,
        expiryMinutes: EMAIL_OTP_EXPIRY_IN / 60,
      }),
    });

    return NextResponse.json({ success: true });
  },
);

"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { isEmailDomainBlocked } from "@/lib/email/is-email-domain-blocked";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { sendEmail } from "@dub/email";
import VerifyEmail from "@dub/email/templates/verify-email";
import { flattenValidationErrors } from "next-safe-action";
import * as z from "zod/v4";
import { generateOTP } from "../auth";
import { EMAIL_OTP_EXPIRY_IN } from "../auth/constants";
import { isGenericEmail } from "../email/is-generic-email";
import { emailSchema, passwordSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const schema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
});

// Send OTP to email to verify account
export const sendOtpAction = actionClient
  .inputSchema(schema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.signupOtpSend,
      identifier: [email, await getIP()],
    });

    const emailDomainBlocked = await isEmailDomainBlocked(email);

    // if any of the flags match, run one final edge case check, before throwing an error
    if (isGenericEmail(email) || emailDomainBlocked) {
      // edge case: the user already has a partner account on Dub with this email address,
      // or they have an existing application for a program, we can allow them to continue
      const [isPartnerAccount, hasExistingApplications] = await Promise.all([
        prisma.partner.findUnique({
          where: {
            email,
          },
        }),
        prisma.programApplication.findFirst({
          where: {
            email,
          },
        }),
      ]);
      if (!isPartnerAccount && !hasExistingApplications) {
        throw new Error(
          "Invalid email address – please use your work email instead. If you think this is a mistake, please contact us at dub.co/support",
        );
      }
    }

    const isExistingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isExistingUser) {
      return;
    }

    const code = generateOTP();

    await prisma.emailVerificationToken.deleteMany({
      where: {
        identifier: email,
      },
    });

    await Promise.all([
      prisma.emailVerificationToken.create({
        data: {
          identifier: email,
          token: code,
          expires: new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000),
        },
      }),

      sendEmail({
        subject: "Dub: OTP to verify your account",
        to: email,
        react: VerifyEmail({
          email,
          code,
        }),
      }),
    ]);
  });

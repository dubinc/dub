"use server";

import { generateOTP } from "@/lib/auth/utils";
import { qstash } from "@/lib/cron";
import { ratelimit, redis } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import VerifyEmailForAccountMerge from "@dub/email/templates/verify-email-for-account-merge";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const CACHE_KEY_PREFIX = "merge-partner-accounts";
const CACHE_EXPIRY_IN = 10 * 60; // 10 minutes
const EMAIL_OTP_EXPIRY_IN = 5 * 60; // 5 minutes
const MAX_ATTEMPTS = 3; // 3 attempts per 24 hours

const schema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("send-tokens"),
    sourceEmail: emailSchema,
    targetEmail: emailSchema,
  }),

  z.object({
    step: z.literal("verify-tokens"),
    sourceEmail: emailSchema,
    targetEmail: emailSchema,
    sourceCode: z.string().min(1),
    targetCode: z.string().min(1),
  }),

  z.object({
    step: z.literal("merge-accounts"),
  }),
]);

export const mergePartnerAccountsAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;
    const { step } = parsedInput;

    switch (step) {
      case "send-tokens":
        return await sendTokens({
          ...parsedInput,
          userId: user.id,
        });
      case "verify-tokens":
        return await verifyTokens({
          ...parsedInput,
          userId: user.id,
        });
      case "merge-accounts":
        return await mergeAccounts({
          userId: user.id,
        });
      default:
        throw new Error("Unknown step.");
    }
  });

// Step 1: Send email verification tokens
const sendTokens = async ({
  sourceEmail,
  targetEmail,
  userId,
}: {
  sourceEmail: string;
  targetEmail: string;
  userId: string;
}) => {
  const { success } = await ratelimit(MAX_ATTEMPTS, "24 h").limit(
    `${CACHE_KEY_PREFIX}:step-1:${userId}`,
  );

  if (!success) {
    throw new Error(
      "You've reached the maximum number of attempts for the past 24 hours. Please wait and try again later.",
    );
  }

  const anotherRequestExists = await redis.exists(
    `${CACHE_KEY_PREFIX}:${userId}`,
  );

  if (anotherRequestExists) {
    throw new Error(
      "Another verification process is already in progress. Please wait for it to complete before starting a new one.",
    );
  }

  if (sourceEmail === targetEmail) {
    throw new Error("Source and target emails cannot be the same.");
  }

  const partnerAccounts = await prisma.partner.findMany({
    where: {
      email: {
        in: [sourceEmail, targetEmail],
      },
    },
    select: {
      id: true,
      email: true,
      payoutsEnabledAt: true,
    },
  });

  if (partnerAccounts.length === 0) {
    throw new Error(
      "Partner accounts not found. Please check the emails you entered.",
    );
  }

  const sourceAccount = partnerAccounts.find(
    ({ email }) => email === sourceEmail,
  );

  const targetAccount = partnerAccounts.find(
    ({ email }) => email === targetEmail,
  );

  if (!sourceAccount) {
    throw new Error(
      `Source partner account ${sourceEmail} not found. Please check the email you entered.`,
    );
  }

  if (!targetAccount) {
    throw new Error(
      `Target partner account ${targetEmail} not found. Please check the email you entered.`,
    );
  }

  if (sourceAccount.payoutsEnabledAt) {
    throw new Error(
      "Account merging is not available if payouts are enabled on the source account. Please contact our support for assistance.",
    );
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      identifier: {
        in: [sourceEmail, targetEmail],
      },
    },
  });

  await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

  const sourceEmailCode = generateOTP();
  const targetEmailCode = generateOTP();
  const expires = new Date(Date.now() + EMAIL_OTP_EXPIRY_IN * 1000);

  await prisma.emailVerificationToken.createMany({
    data: [
      {
        identifier: sourceEmail,
        token: sourceEmailCode,
        expires,
      },
      {
        identifier: targetEmail,
        token: targetEmailCode,
        expires,
      },
    ],
  });

  await resend?.batch.send([
    {
      from: VARIANT_TO_FROM_MAP.notifications,
      to: sourceEmail,
      subject: "Verify your email to merge your Dub Partners accounts",
      react: VerifyEmailForAccountMerge({
        email: sourceEmail,
        code: sourceEmailCode,
        expiresInMinutes: EMAIL_OTP_EXPIRY_IN / 60,
      }),
    },
    {
      from: VARIANT_TO_FROM_MAP.notifications,
      to: targetEmail,
      subject: "Verify your email to merge your Dub Partners accounts",
      react: VerifyEmailForAccountMerge({
        email: targetEmail,
        code: targetEmailCode,
        expiresInMinutes: EMAIL_OTP_EXPIRY_IN / 60,
      }),
    },
  ]);
};

// Step 2: Verify email verification tokens
const verifyTokens = async ({
  sourceEmail,
  targetEmail,
  sourceCode,
  targetCode,
  userId,
}: {
  sourceEmail: string;
  targetEmail: string;
  sourceCode: string;
  targetCode: string;
  userId: string;
}) => {
  const { success } = await ratelimit(MAX_ATTEMPTS, "24 h").limit(
    `${CACHE_KEY_PREFIX}:step-2:${userId}`,
  );

  if (!success) {
    throw new Error(
      "You've reached the maximum number of attempts for the past 24 hours. Please wait and try again later.",
    );
  }

  const [sourceToken, targetToken] = await Promise.all([
    prisma.emailVerificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: sourceEmail,
          token: sourceCode,
        },
      },
    }),

    prisma.emailVerificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: targetEmail,
          token: targetCode,
        },
      },
    }),
  ]);

  if (!sourceToken) {
    throw new Error(
      `The code entered for ${sourceEmail} does not match. Please double-check it and enter it again.`,
    );
  }

  if (sourceToken.expires < new Date()) {
    throw new Error(
      `The code entered for ${sourceEmail} has expired. Please request a new code.`,
    );
  }

  if (!targetToken) {
    throw new Error(
      `The code entered for ${targetEmail} does not match. Please double-check it and enter it again.`,
    );
  }

  if (targetToken.expires < new Date()) {
    throw new Error(
      `The code entered for ${targetEmail} has expired. Please request a new code.`,
    );
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      identifier: {
        in: [sourceEmail, targetEmail],
      },
    },
  });

  // Make sure this is set before going to the next step
  await redis.set(
    `${CACHE_KEY_PREFIX}:${userId}`,
    {
      sourceEmail,
      targetEmail,
      status: "verified",
    },
    {
      ex: CACHE_EXPIRY_IN,
    },
  );

  const partnerAccounts = await prisma.partner.findMany({
    where: {
      email: {
        in: [sourceEmail, targetEmail],
      },
    },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  if (partnerAccounts.length === 0) {
    throw new Error("Could not find the partner accounts. Please try again.");
  }

  return partnerAccounts.sort((a, b) => {
    if (a.email === sourceEmail) return -1;
    if (b.email === sourceEmail) return 1;
    return 0;
  });
};

// Step 3: Merge partner accounts
const mergeAccounts = async ({ userId }: { userId: string }) => {
  const { success } = await ratelimit(MAX_ATTEMPTS, "24 h").limit(
    `${CACHE_KEY_PREFIX}:step-3:${userId}`,
  );

  if (!success) {
    throw new Error(
      "You've reached the maximum number of attempts for the past 24 hours. Please wait and try again later.",
    );
  }

  const accounts = await redis.get<{
    sourceEmail: string;
    targetEmail: string;
  }>(`${CACHE_KEY_PREFIX}:${userId}`);

  if (!accounts) {
    throw new Error(
      "The verification process has been expired. Please restart the process again from the beginning.",
    );
  }

  if (!accounts.sourceEmail || !accounts.targetEmail) {
    throw new Error("Unknown error occurred. Please try again.");
  }

  const { sourceEmail, targetEmail } = accounts;

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/merge-partner-accounts`,
    body: {
      userId,
      sourceEmail,
      targetEmail,
    },
  });
};

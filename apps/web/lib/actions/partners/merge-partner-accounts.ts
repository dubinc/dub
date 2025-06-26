"use server";

import { includeTags } from "@/lib/api/links/include-tags";
import { generateOTP } from "@/lib/auth/utils";
import { qstash } from "@/lib/cron";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerAccountMerged from "@dub/email/templates/partner-account-merged";
import VerifyEmailForAccountMerge from "@dub/email/templates/verify-email-for-account-merge";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const CACHE_KEY_PREFIX = "merge-partner-accounts";
const CACHE_EXPIRY_IN = 10 * 60; // 10 minutes
const EMAIL_OTP_EXPIRY_IN = 5 * 60; // 5 minutes

const sendTokensSchema = z.object({
  step: z.literal("send-tokens"),
  sourceEmail: emailSchema,
  targetEmail: emailSchema,
});

const verifyTokensSchema = z.object({
  step: z.literal("verify-tokens"),
  sourceEmail: emailSchema,
  targetEmail: emailSchema,
  sourceCode: z.string().min(1),
  targetCode: z.string().min(1),
});

const mergeAccountsSchema = z.object({
  step: z.literal("merge-accounts"),
});

const schema = z.discriminatedUnion("step", [
  sendTokensSchema,
  verifyTokensSchema,
  mergeAccountsSchema,
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
        throw new Error(`Unknown step: ${step}.`);
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
    },
  });

  if (partnerAccounts.length === 0) {
    throw new Error(
      "One or both partner accounts not found. Please check the emails you entered.",
    );
  }

  const sourceAccount = partnerAccounts.find(
    ({ email }) => email === sourceEmail,
  );

  const targetAccount = partnerAccounts.find(
    ({ email }) => email === targetEmail,
  );

  if (!sourceAccount || !targetAccount) {
    throw new Error(
      "One or both partner accounts not found. Please check the emails you entered.",
    );
  }

  await Promise.all([
    prisma.emailVerificationToken.deleteMany({
      where: {
        identifier: {
          in: [sourceEmail, targetEmail],
        },
      },
    }),

    redis.del(`${CACHE_KEY_PREFIX}:${userId}`),
  ]);

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
      subject: "Connect your payout details on Dub Partners",
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
  console.info("data", {
    sourceEmail,
    targetEmail,
    sourceCode,
    targetCode,
    userId,
  });

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
      id: true,
      email: true,
      image: true,
    },
  });

  if (partnerAccounts.length === 0) {
    throw new Error("Could not find the partner accounts. Please try again.");
  }

  return partnerAccounts;
};

// Step 3: Merge partner accounts
const mergeAccounts = async ({ userId }: { userId: string }) => {
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

  const partnerAccounts = await prisma.partner.findMany({
    where: {
      email: {
        in: [sourceEmail, targetEmail],
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (partnerAccounts.length === 0) {
    throw new Error("One or both partner accounts not found.");
  }

  const sourceAccount = partnerAccounts.find(
    ({ email }) => email === sourceEmail,
  );

  const targetAccount = partnerAccounts.find(
    ({ email }) => email === targetEmail,
  );

  if (!sourceAccount || !targetAccount) {
    throw new Error("One or both partner accounts not found.");
  }

  const sourcePartnerId = sourceAccount.id;
  const targetPartnerId = targetAccount.id;

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: sourcePartnerId,
    },
    select: {
      programId: true,
    },
  });

  // Find program ids to transfer
  const programIds = programEnrollments.map(
    (enrollment) => enrollment.programId,
  );

  await prisma.programEnrollment.updateMany({
    where: {
      programId: {
        in: programIds,
      },
      partnerId: sourcePartnerId,
    },
    data: {
      partnerId: targetPartnerId,
    },
  });

  await prisma.commission.updateMany({
    where: {
      programId: {
        in: programIds,
      },
      partnerId: sourcePartnerId,
    },
    data: {
      partnerId: targetPartnerId,
    },
  });

  await prisma.payout.updateMany({
    where: {
      programId: {
        in: programIds,
      },
      partnerId: sourcePartnerId,
    },
    data: {
      partnerId: targetPartnerId,
    },
  });

  await prisma.link.updateMany({
    where: {
      programId: {
        in: programIds,
      },
      partnerId: sourcePartnerId,
    },
    data: {
      partnerId: targetPartnerId,
    },
  });

  const updatedLinks = await prisma.link.findMany({
    where: {
      programId: {
        in: programIds,
      },
      partnerId: targetPartnerId,
    },
    include: includeTags,
  });

  // TODO:
  // Remove the source partner from the database

  await prisma.partner.delete({
    where: {
      id: sourcePartnerId,
    },
  });

  await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

  waitUntil(
    Promise.all([
      recordLink(updatedLinks),

      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-partners`,
        body: {
          partnerId: targetPartnerId,
        },
      }),

      resend?.batch.send([
        {
          from: VARIANT_TO_FROM_MAP.notifications,
          to: sourceEmail,
          subject: "Your Dub partner accounts are now merged",
          react: PartnerAccountMerged({
            email: sourceEmail,
            sourceEmail,
            targetEmail,
          }),
        },
        {
          from: VARIANT_TO_FROM_MAP.notifications,
          to: targetEmail,
          subject: "Your Dub partner accounts are now merged",
          react: PartnerAccountMerged({
            email: targetEmail,
            sourceEmail,
            targetEmail,
          }),
        },
      ]),
    ]),
  );
};

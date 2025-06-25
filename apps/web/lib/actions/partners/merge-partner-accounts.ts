"use server";

import { EMAIL_OTP_EXPIRY_IN } from "@/lib/auth/constants";
import { generateOTP } from "@/lib/auth/utils";
import { redis } from "@/lib/upstash";
import { emailSchema } from "@/lib/zod/schemas/auth";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const CACHE_KEY_PREFIX = "merge-partner-accounts";
const CACHE_EXPIRY_IN = 10 * 60;

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
    const { user, partner } = ctx;
    const { step } = parsedInput;

    switch (step) {
      case "send-tokens":
        return await sendTokens(parsedInput);
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
}: {
  sourceEmail: string;
  targetEmail: string;
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
    (account) => account?.email === sourceEmail,
  );

  const targetAccount = partnerAccounts.find(
    (account) => account?.email === targetEmail,
  );

  if (!sourceAccount || !targetAccount) {
    throw new Error(
      "One or both partner accounts not found. Please check the emails you entered.",
    );
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      identifier: {
        in: [sourceEmail, targetEmail],
      },
    },
  });

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

  if (!resend) {
    throw new Error("Resend is not configured.");
  }

  waitUntil(
    resend.batch.send([
      {
        from: VARIANT_TO_FROM_MAP.notifications,
        to: sourceEmail,
        subject: "Verify your email to merge your Dub Partners accounts",
        react: "",
      },
      {
        from: VARIANT_TO_FROM_MAP.notifications,
        to: targetEmail,
        subject: "Connect your payout details on Dub Partners",
        react: "",
      },
    ]),
  );
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
  const tokens = await prisma.emailVerificationToken.findMany({
    where: {
      identifier: {
        in: [sourceEmail, targetEmail],
      },
    },
  });

  if (tokens.length === 0) {
    throw new Error(
      "That code doesn’t match our records. Please double-check it and enter it again.",
    );
  }

  const sourceToken = tokens.find((token) => token.identifier === sourceEmail);

  if (sourceToken?.token !== sourceCode) {
    throw new Error(
      "The code entered for the source email does not match. Please double-check it and enter it again.",
    );
  }

  const targetToken = tokens.find((token) => token.identifier === targetEmail);

  if (targetToken?.token !== targetCode) {
    throw new Error(
      "The code entered for the target email does not match. Please double-check it and enter it again.",
    );
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      identifier: {
        in: [sourceEmail, targetEmail],
      },
    },
  });

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
};

// Step 3: Merge partner accounts
const mergeAccounts = async ({ userId }: { userId: string }) => {
  const accountInfo = await redis.get<{
    sourceEmail: string;
    targetEmail: string;
  }>(`${CACHE_KEY_PREFIX}:${userId}`);

  if (!accountInfo) {
    throw new Error(
      "The verification process has been expired. Please restart the process again from the beginning.",
    );
  }

  if (!accountInfo.sourceEmail || !accountInfo.targetEmail) {
    throw new Error("Unknown error occurred. Please try again.");
  }

  const { sourceEmail, targetEmail } = accountInfo;

  // TODO:
  // Do the real work here
};

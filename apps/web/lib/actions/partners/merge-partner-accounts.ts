"use server";

import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const sendTokensSchema = z.object({
  step: z.literal("send-tokens"),
  sourceEmail: z.string().email().min(1),
  targetEmail: z.string().email().min(1),
});

const verifyTokensSchema = z.object({
  step: z.literal("verify-tokens"),
  sourceEmail: z.string().email().min(1),
  targetEmail: z.string().email().min(1),
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
        return await verifyTokens(parsedInput);
      case "merge-accounts":
        return await mergeAccounts();
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
    //
};

// Step 2: Verify email verification tokens
const verifyTokens = async ({
  sourceEmail,
  targetEmail,
  sourceCode,
  targetCode,
}: {
  sourceEmail: string;
  targetEmail: string;
  sourceCode: string;
  targetCode: string;
}) => {
  // TODO: Implement
};

// Step 3: Merge partner accounts
const mergeAccounts = async () => {
  // TODO: Implement
};

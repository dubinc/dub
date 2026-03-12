"use server";

import { BountySubmissionHandler } from "@/lib/bounty/api/create-bounty-submission";
import { createBountySubmissionInputSchema } from "@/lib/zod/schemas/bounties";
import { authPartnerActionClient } from "../safe-action";

export const createBountySubmissionAction = authPartnerActionClient
  .inputSchema(createBountySubmissionInputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;

    const handler = new BountySubmissionHandler({
      ...parsedInput,
      partner,
    });

    await handler.submit();
  });

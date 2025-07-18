"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

// TODO
// See if we can combine this with the updatePartnerProfileAction

const schema = z.object({
  minWithdrawalAmount: z
    .enum(["1000", "2000", "5000", "10000"])
    .describe("Amount in cents"),
});

// Update a partner withdrawal amount
export const updatePartnerWithdrawalAmountAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { minWithdrawalAmount } = parsedInput;

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        minWithdrawalAmount: parseInt(minWithdrawalAmount),
      },
    });
  });

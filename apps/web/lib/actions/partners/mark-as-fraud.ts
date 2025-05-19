"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const markAsFraudSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  commissionId: z.string(),
});

// Mark a commission as fraud for a partner + customer for all historical commissions
export const markAsFraudAction = authActionClient
  .schema(markAsFraudSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, commissionId } = parsedInput;

    if (programId !== workspace.defaultProgramId) {
      throw new Error("Program not found.");
    }

    const commission = await prisma.commission.findUniqueOrThrow({
      where: {
        id: commissionId,
      },
    });

    if (commission.programId !== programId) {
      throw new Error("Commission not found.");
    }

    const { partnerId, customerId } = commission;

    // Find all historical commissions for this customer
    const commissions = await prisma.commission.findMany({
      where: {
        partnerId,
        customerId,
        status: {
          in: ["pending", "processed"],
        },
      },
      include: {
        payout: true,
      },
    });

    const commissionsWithPayout = commissions.filter(
      (commission) => commission.payout,
    );

    // Group commissions by payout ID to batch updates
    const payoutUpdates = commissionsWithPayout.reduce(
      (acc, commission) => {
        const payoutId = commission.payout!.id;

        if (!acc[payoutId]) {
          acc[payoutId] = {
            payoutId,
            currentAmount: commission.payout!.amount,
            earningsToDeduct: 0,
          };
        }

        acc[payoutId].earningsToDeduct += commission.earnings;

        return acc;
      },
      {} as Record<
        string,
        {
          payoutId: string;
          currentAmount: number;
          earningsToDeduct: number;
        }
      >,
    );

    await prisma.$transaction(
      Object.values(payoutUpdates).map(
        ({ payoutId, currentAmount, earningsToDeduct }) =>
          prisma.payout.update({
            where: {
              id: payoutId,
            },
            data: {
              amount: currentAmount - earningsToDeduct,
            },
          }),
      ),
    );

    await prisma.commission.updateMany({
      where: {
        id: {
          in: commissions.map((commission) => commission.id),
        },
      },
      data: {
        status: "fraud",
        payoutId: null,
      },
    });
  });

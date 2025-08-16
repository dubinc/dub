"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const markCommissionFraudOrCanceledSchema = z.object({
  workspaceId: z.string(),
  commissionId: z.string(),
  status: z.enum(["fraud", "canceled"]),
});

// Mark a commission as fraud or canceled for a partner + customer for all historical commissions
export const markCommissionFraudOrCanceledAction = authActionClient
  .schema(markCommissionFraudOrCanceledSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commissionId, status } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const commission = await prisma.commission.findUniqueOrThrow({
      where: {
        id: commissionId,
      },
    });

    if (commission.programId !== programId) {
      throw new Error("Commission not found.");
    }

    if (commission.type === "custom") {
      throw new Error(
        "You cannot mark a custom commission as fraud or canceled.",
      );
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
        status,
        payoutId: null,
      },
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          syncTotalCommissions({
            partnerId: commission.partnerId,
            programId,
          }),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action:
              status === "fraud"
                ? "commission.marked_fraud"
                : "commission.canceled",
            description: `Commission ${commissionId} marked as ${status}`,
            actor: user,
            targets: [
              {
                type: "commission",
                id: commissionId,
                metadata: commission,
              },
            ],
          }),
        ]);
      })(),
    );
  });

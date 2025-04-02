"use server";

import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const updateCommissionStatusSchema = z.object({
  workspaceId: z.string(),
  commissionId: z.string(),
  status: z.enum([
    CommissionStatus.duplicate,
    CommissionStatus.fraud,
    CommissionStatus.pending,
  ]), // We might want to support other statuses in the future
});

// Mark a sale as duplicate or fraud or pending
export const updateCommissionStatusAction = authActionClient
  .schema(updateCommissionStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { commissionId, status } = parsedInput;

    const sale = await prisma.commission.findUniqueOrThrow({
      where: {
        id: commissionId,
        program: {
          workspaceId: workspace.id,
        },
      },
      include: {
        payout: true,
      },
    });

    if (sale.status === "paid") {
      throw new Error("You cannot update the status of a paid sale.");
    }

    // there is a payout associated with this sale
    // we need to update the payout amount if the sale is being marked as duplicate or fraud
    if (sale.payout) {
      const earnings = sale.earnings;
      const revisedAmount = sale.payout.amount - earnings;

      await prisma.payout.update({
        where: {
          id: sale.payout.id,
        },
        data: {
          amount: revisedAmount,
        },
      });
    }

    await prisma.commission.update({
      where: {
        id: sale.id,
      },
      data: {
        status,
        payoutId: null,
      },
    });

    // TODO: We might want to store the history of the sale status changes
    // TODO: Send email to the partner informing them about the sale status change
  });

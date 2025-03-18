"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
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
    const { workspace, user } = ctx;
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

    const updatedCommission = await prisma.commission.update({
      where: {
        id: sale.id,
      },
      data: {
        status,
        payoutId: null,
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId: sale.programId,
        actor: user,
        event:
          updatedCommission.status === "duplicate"
            ? "sale.mark_duplicate"
            : updatedCommission.status === "fraud"
              ? "sale.mark_fraud"
              : "sale.mark_pending",
        targets: [
          {
            type: "sale",
            id: updatedCommission.id,
            metadata: updatedCommission,
          },
        ],
      }),
    );

    // TODO: We might want to store the history of the sale status changes
    // TODO: Send email to the partner informing them about the sale status change
  });

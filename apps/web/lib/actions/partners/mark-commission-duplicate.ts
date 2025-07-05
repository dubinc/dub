"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const markCommissionDuplicateSchema = z.object({
  workspaceId: z.string(),
  commissionId: z.string(),
});

// Mark a sale as duplicate or fraud or pending
export const markCommissionDuplicateAction = authActionClient
  .schema(markCommissionDuplicateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commissionId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const commission = await prisma.commission.findUniqueOrThrow({
      where: {
        id: commissionId,
      },
      include: {
        payout: true,
      },
    });

    if (commission.programId !== programId) {
      throw new DubApiError({
        code: "not_found",
        message: "Commission not found.",
      });
    }

    if (commission.status === "paid") {
      throw new Error("You cannot mark a paid commission as duplicate.");
    }

    if (commission.type === "custom") {
      throw new Error("You cannot mark a custom commission as duplicate.");
    }

    // there is a payout associated with this sale
    // we need to update the payout amount if the sale is being marked as duplicate
    if (commission.payout) {
      const earnings = commission.earnings;
      const revisedAmount = commission.payout.amount - earnings;

      await prisma.payout.update({
        where: {
          id: commission.payout.id,
        },
        data: {
          amount: revisedAmount,
        },
      });
    }

    await prisma.commission.update({
      where: {
        id: commission.id,
      },
      data: {
        status: "duplicate",
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
            action: "commission.marked_duplicate",
            description: `Commission ${commissionId} marked as duplicate`,
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

    // TODO: We might want to store the history of the sale status changes
    // TODO: Send email to the partner informing them about the sale status change
  });

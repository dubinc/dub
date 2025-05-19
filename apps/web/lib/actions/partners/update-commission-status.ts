"use server";

import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const updateCommissionStatusSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
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
    const { programId, commissionId, status } = parsedInput;

    if (programId !== workspace.defaultProgramId) {
      throw new DubApiError({
        code: "not_found",
        message: "Program not found.",
      });
    }

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
      throw new Error("You cannot update the status of a paid sale.");
    }

    // there is a payout associated with this sale
    // we need to update the payout amount if the sale is being marked as duplicate or fraud
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
        status,
        payoutId: null,
      },
    });

    // TODO: We might want to store the history of the sale status changes
    // TODO: Send email to the partner informing them about the sale status change
  });

"use server";

import { prisma } from "@/lib/prisma";
import { SaleStatus } from "@prisma/client";
import { z } from "zod";
import { authActionClient } from "./safe-action";

const updateSaleStatusSchema = z.object({
  workspaceId: z.string(),
  saleId: z.string(),
  status: z.enum([SaleStatus.duplicate, SaleStatus.fraud, SaleStatus.pending]), // We might want to support other statuses in the future
});

// Mark a sale as duplicate or fraud or pending
export const updateSaleStatusAction = authActionClient
  .schema(updateSaleStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { saleId, status } = parsedInput;

    const sale = await prisma.sale.findUniqueOrThrow({
      where: {
        id: saleId,
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
      const revisedFee = revisedAmount * 0.02;

      await prisma.payout.update({
        where: {
          id: sale.payout.id,
        },
        data: {
          amount: revisedAmount,
          fee: revisedFee,
          total: revisedAmount + revisedFee,
        },
      });
    }

    await prisma.sale.update({
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

"use server";

import { prisma, SaleStatus } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "./safe-action";

const updateSaleStatusSchema = z.object({
  workspaceId: z.string(),
  saleId: z.string(),
  status: z.nativeEnum(SaleStatus),
});

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
    });

    if (sale.status === "paid") {
      throw new Error("You cannot update a paid sale status.");
    }

    await prisma.sale.update({
      where: {
        id: sale.id,
      },
      data: {
        status,
      },
    });

    // TODO: [payouts] Send email to the partner informing them about the sale status change
    // TODO: [payouts] Update associated payout based on new status (fraud, duplicate, etc.)

    return {
      ok: true,
    };
  });

"use server";

import { prisma } from "@/lib/prisma";
import { SaleStatus } from "@prisma/client";
import { z } from "zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  saleId: z.string(),
  status: z.nativeEnum(SaleStatus),
});

export const updateSaleStatusAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { saleId, status } = parsedInput;

    await prisma.sale.update({
      where: {
        id: saleId,
        program: {
          workspaceId: workspace.id,
        },
      },
      data: {
        status,
      },
    });

    // TODO:
    // Send email to the partner informing them about the sale status change

    return {
      ok: true,
    };
  });

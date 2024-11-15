"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createOrgTransfer } from "../../dots/create-org-transfer";
import { createTransfer } from "../../dots/create-transfer";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  payoutId: z.string(),
});

export const createDotsTransferAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { payoutId } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Dots app not found for workspace");
    }

    const payout = await prisma.payout.findUniqueOrThrow({
      where: { id: payoutId },
    });

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: payout.partnerId,
          programId: payout.programId,
        },
      },
      select: { dotsUserId: true },
    });

    if (!programEnrollment.dotsUserId) {
      throw new Error("Partner is not properly enrolled in this program");
    }

    const [transfer, orgTransfer] = await Promise.all([
      createTransfer({
        amount: payout.amount,
        dotsAppId: workspace.dotsAppId,
        dotsUserId: programEnrollment.dotsUserId,
      }),
      createOrgTransfer({
        amount: payout.fee,
        dotsAppId: workspace.dotsAppId,
      }),
    ]);

    await Promise.all([
      prisma.payout.update({
        where: { id: payoutId },
        data: { dotsTransferId: transfer.id, status: "completed" },
      }),
      prisma.sale.updateMany({
        where: { payoutId },
        data: { status: "paid" },
      }),
    ]);

    return { transfer, orgTransfer };
  });

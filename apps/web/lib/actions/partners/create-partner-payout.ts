"use server";

import { processPartnerPayout } from "@/lib/partners/process-payout";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  payoutId: z.string(),
});

export const createPartnerPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { payoutId } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Partner payouts are not enabled for this workspace.");
    }

    const payout = await prisma.payout.findUniqueOrThrow({
      where: { id: payoutId },
    });

    const result = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: payout.partnerId,
          programId: payout.programId,
        },
      },
      select: {
        dotsUserId: true,
        program: true,
      },
    });

    const { program, ...programEnrollment } = result;

    if (!programEnrollment.dotsUserId) {
      throw new Error("Partner is not properly enrolled in this program");
    }

    const { transfer, orgTransfer } = await processPartnerPayout({
      workspace,
      programEnrollment,
      program,
      payout,
    });

    return {
      transfer,
      orgTransfer,
    };
  });

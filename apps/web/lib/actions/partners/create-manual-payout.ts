"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { createId } from "@/lib/api/utils";
import { createSalesPayout } from "@/lib/partners/create-sales-payout";
import { processPartnerPayout } from "@/lib/partners/process-payout";
import { prisma } from "@/lib/prisma";
import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { Payout, PayoutType } from "@prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  start: parseDateSchema,
  end: parseDateSchema,
  type: z.nativeEnum(PayoutType),
  eventCount: z.number().default(0),
  amount: z.number().default(0),
  description: z.string().max(5000).nullish(),
});

// When leads:

export const createManualPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      programId,
      partnerId,
      start,
      end,
      type,
      amount,
      description,
      eventCount,
    } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Partner payouts are not enabled for this workspace.");
    }

    const [program, programEnrollment] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        select: {
          dotsUserId: true,
        },
      }),
    ]);

    if (!programEnrollment.dotsUserId) {
      throw new Error("Partner is not properly enrolled in this program.");
    }

    let payout: Payout | undefined = undefined;

    // Create a payout for clicks, leads, and custom events
    if (["clicks", "leads", "custom"].includes(type)) {
      const amountInCents = amount * 100;
      const fee = amountInCents * 0.02;

      payout = await prisma.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          fee,
          type,
          description,
          eventCount,
          periodStart: start as Date,
          periodEnd: end as Date,
          amount: amountInCents,
          total: amountInCents + fee,
        },
      });
    }

    // Create a payout for sales
    if (type === "sales") {
      payout = await createSalesPayout({
        programId,
        partnerId,
        periodStart: start as Date,
        periodEnd: end as Date,
      });
    }

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
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

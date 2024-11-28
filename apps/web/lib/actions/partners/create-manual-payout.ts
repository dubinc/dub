"use server";

import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { createId } from "@/lib/api/utils";
import { createSalesPayout } from "@/lib/partners/create-sales-payout";
import { prisma } from "@/lib/prisma";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { Payout } from "@prisma/client";
import { authActionClient } from "../safe-action";

export const createManualPayoutAction = authActionClient
  .schema(createManualPayoutSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, start, end, type, amount, description } =
      parsedInput;

    if (["clicks", "leads", "sales"].includes(type) && (!start || !end)) {
      throw new Error("Please select a date range to create a payout.");
    }

    // if (!workspace.dotsAppId) {
    //   throw new Error("Partner payouts are not enabled for this workspace.");
    // }

    const [_, programEnrollment] = await Promise.all([
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
          linkId: true,
        },
      }),
    ]);

    // if (!programEnrollment.dotsUserId) {
    //   throw new Error("Partner is not properly enrolled in this program.");
    // }

    if (!programEnrollment.linkId) {
      throw new Error("No short link found for this partner in this program.");
    }

    let payout: Payout | undefined = undefined;

    // Create a payout for clicks, leads, and custom events
    if (["clicks", "leads", "custom"].includes(type)) {
      let quantity: number | undefined = undefined;

      if (type === "clicks" || type === "leads") {
        const count = await getAnalytics({
          linkId: programEnrollment.linkId,
          event: type as any,
          groupBy: "count",
          start: start as Date,
          end: end as Date,
        });

        quantity = count[type];
      }

      const amountInCents = amount * 100;
      const fee = amountInCents * 0.02;

      payout = await prisma.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          fee,
          type,
          quantity,
          amount: amountInCents,
          total: amountInCents + fee,
          periodEnd: end as Date,
          periodStart: start as Date,
          description,
        },
      });
    }

    // Create a payout for sales
    else if (type === "sales") {
      payout = await createSalesPayout({
        programId,
        partnerId,
        periodStart: start as Date,
        periodEnd: end as Date,
      });
    }

    console.info("Manual payout created", payout);

    return payout;
  });

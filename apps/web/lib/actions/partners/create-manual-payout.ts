"use server";

import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { createId } from "@/lib/api/utils";
import { createSalesPayout } from "@/lib/partners/create-sales-payout";
import { prisma } from "@/lib/prisma";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { Payout } from "@prisma/client";
import { authActionClient } from "../safe-action";

const schema = createManualPayoutSchema.refine(
  (data) => {
    return data.type === "custom" || (data.start && data.end);
  },
  {
    message: "Please select a date range",
    path: ["start"],
  },
);

export const createManualPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, start, end, type, amount, description } =
      parsedInput;

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

    if (!programEnrollment.linkId) {
      throw new Error("No short link found for this partner in this program.");
    }

    let payout: Payout | undefined = undefined;

    // Create a payout for sales
    if (type === "sales") {
      payout = await createSalesPayout({
        programId,
        partnerId,
        periodStart: start!,
        periodEnd: end!,
      });
    }

    // Create a payout for clicks, leads, and custom events
    else {
      let quantity: number | undefined = undefined;

      if (type === "clicks" || type === "leads") {
        const count = await getAnalytics({
          linkId: programEnrollment.linkId,
          event: type,
          groupBy: "count",
          start,
          end,
        });

        quantity = count[type];
      }

      const amountInCents = (quantity || 1) * (amount || 0) * 100;
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
          periodStart: start,
          periodEnd: end,
          description,
        },
      });
    }

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    console.info("Manual payout created", payout);

    return payout;
  });

"use server";

import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createId } from "@/lib/api/utils";
import { createSalesPayout } from "@/lib/partners/create-sales-payout";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { Payout } from "@dub/prisma/client";
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
          linkId: true,
        },
      }),
    ]);

    if (!programEnrollment.linkId) {
      throw new Error("No short link found for this partner in this program.");
    }

    let payout: Payout | null = null;

    // Create a payout for sales
    if (type === "sales") {
      payout =
        (await createSalesPayout({
          programId,
          partnerId,
          periodStart: start,
          periodEnd: end,
          description: description ?? undefined,
        })) ?? null;

      if (!payout) {
        throw new Error(
          "No valid sales found for this period. Payout was not created.",
        );
      }
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

      const amountInCents = (quantity || 1) * (amount || 0);

      payout = await prisma.payout.create({
        data: {
          id: createId({ prefix: "po_" }),
          programId,
          partnerId,
          type,
          quantity,
          amount: amountInCents,
          periodStart: start,
          periodEnd: end,
          description,
        },
      });
    }

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    return payout;
  });

"use server";

import { getAnalytics } from "@/lib/analytics/get-analytics";
import { createId } from "@/lib/api/create-id";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
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

    const [_program, programEnrollment] = await Promise.all([
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
          programId: true,
          partnerId: true,
          _count: {
            select: {
              links: true,
            },
          },
        },
      }),
    ]);

    if (!programEnrollment._count.links) {
      throw new Error("No short link found for this partner in this program.");
    }

    let quantity: number | undefined = undefined;

    if (type === "clicks" || type === "leads") {
      const count = await getAnalytics({
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        event: type,
        groupBy: "count",
        start,
        end,
      });

      quantity = count[type];

      if (quantity === 0) {
        throw new Error(
          `No ${type} found for this period. Payout was not created.`,
        );
      }
    }

    const amountInCents = (quantity || 1) * (amount || 0);

    const payout = await prisma.payout.create({
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

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    return payout;
  });

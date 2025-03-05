"use server";

import { createId } from "@/lib/api/create-id";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createManualPayoutSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { PayoutType } from "@prisma/client";
import { authActionClient } from "../safe-action";

const schema = createManualPayoutSchema;

export const createManualPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, amount, description } = parsedInput;

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

    const amountInCents = amount || 0;

    const payout = await prisma.payout.create({
      data: {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        type: PayoutType.custom,
        amount: amountInCents,
        description,
      },
    });

    if (!payout) {
      throw new Error("Failed to create payout. Please try again.");
    }

    return payout;
  });

"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getPayoutOrThrow } from "@/lib/api/partners/get-payout-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const markPayoutPaidSchema = z.object({
  workspaceId: z.string(),
  payoutId: z.string(),
});

export const markPayoutPaidAction = authActionClient
  .schema(markPayoutPaidSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { payoutId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const payout = await getPayoutOrThrow({
      payoutId,
      programId,
    });

    await Promise.all([
      prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          status: "completed",
          paidAt: new Date(),
        },
      }),

      prisma.commission.updateMany({
        where: {
          payoutId: payout.id,
        },
        data: {
          status: "paid",
        },
      }),
    ]);

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "payout.marked_paid",
        description: `Payout ${payout.id} marked as paid`,
        actor: user,
        targets: [
          {
            type: "payout",
            id: payout.id,
            metadata: payout,
          },
        ],
      }),
    );
  });

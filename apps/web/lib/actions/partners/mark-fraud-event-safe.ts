"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { unbanPartner } from "@/lib/api/partners/unban-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { FRAUD_EVENT_SAFE_REASONS } from "@/lib/zod/schemas/fraud-events";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string().trim().min(1),
  fraudEventId: z.string().trim().min(1),
  ignoreFutureFlags: z.boolean().default(false),
  resolutionReason: z
    .enum(Object.keys(FRAUD_EVENT_SAFE_REASONS) as [string, ...string[]])
    .optional(),
});

export const markFraudEventSafeAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { fraudEventId, resolutionReason, ignoreFutureFlags } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvent = await prisma.fraudEvent.findUniqueOrThrow({
      where: {
        id: fraudEventId,
      },
    });

    if (fraudEvent.programId !== programId) {
      throw new Error(`Fraud event ${fraudEventId} not found.`);
    }

    if (fraudEvent.status === "safe") {
      throw new Error(`Fraud event ${fraudEventId} is already marked as safe.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.fraudEvent.update({
        where: {
          id: fraudEventId,
        },
        data: {
          status: "safe",
          userId: user.id,
          resolutionReason,
          resolvedAt: new Date(),
        },
      });

      if (ignoreFutureFlags) {
        await tx.programEnrollment.update({
          where: {
            partnerId_programId: {
              partnerId: fraudEvent.partnerId,
              programId,
            },
          },
          data: {
            trustedAt: new Date(),
          },
        });
      }

      // Mark the held commissions as pending
      await tx.commission.updateMany({
        where: {
          fraudEventId,
        },
        data: {
          fraudEventId: null,
          status: "pending",
        },
      });
    });

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: fraudEvent.partnerId,
      programId: fraudEvent.programId,
    });

    if (programEnrollment.status === "banned") {
      await unbanPartner({
        workspace,
        program: programEnrollment.program,
        partner: programEnrollment.partner,
        user,
      });
    }

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "fraud_event.marked_safe",
        description: `Fraud event ${fraudEventId} marked as safe`,
        actor: user,
        targets: [
          {
            type: "fraud_event",
            id: fraudEventId,
            metadata: {
              status: "safe",
            },
          },
        ],
      }),
    );
  });

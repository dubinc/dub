"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const rejectPartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
});

// Reject a pending partner
export const rejectPartnerAction = authActionClient
  .schema(rejectPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { programId, partnerId } = parsedInput;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
    });

    if (programEnrollment.status !== "pending") {
      throw new Error("Program enrollment is not pending.");
    }

    const { partner } = await prisma.programEnrollment.update({
      where: {
        id: programEnrollment.id,
      },
      data: {
        status: "rejected",
      },
      include: {
        partner: true,
      },
    });

    // TODO: [partners] Notify partner of rejection?

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId: programId,
        actor: user,
        event: "partner.reject",
        targets: [
          {
            type: "partner",
            id: partnerId,
            metadata: partner,
          },
        ],
      }),
    );
  });

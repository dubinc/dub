"use server";

import { prisma } from "@dub/prisma";
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
    const { workspace } = ctx;
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

    await prisma.programEnrollment.update({
      where: {
        id: programEnrollment.id,
      },
      data: {
        status: "rejected",
      },
    });

    // TODO: [partners] Notify partner of rejection?

    return { ok: true };
  });

"use server";

import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@dub/prisma";
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

    if (programId !== workspace.defaultProgramId) {
      throw new DubApiError({
        code: "not_found",
        message: "Program not found",
      });
    }

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

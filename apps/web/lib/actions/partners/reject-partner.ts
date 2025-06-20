"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { authActionClient } from "../safe-action";

// Reject a pending partner
export const rejectPartnerAction = authActionClient
  .schema(rejectPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

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
        status: ProgramEnrollmentStatus.rejected,
      },
    });
  });

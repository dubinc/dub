"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { archivePartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

// Archive a partner
export const archivePartnerAction = authActionClient
  .schema(archivePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
    });

    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          programId,
          partnerId,
        },
      },
      data: {
        status:
          programEnrollment.status === "archived" ? "approved" : "archived",
      },
    });
  });

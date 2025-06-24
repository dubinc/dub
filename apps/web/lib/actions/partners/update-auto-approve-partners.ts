"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  autoApprovePartners: z.boolean(),
});

export const updateAutoApprovePartnersAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { autoApprovePartners } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    return await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        autoApprovePartnersEnabledAt: autoApprovePartners ? new Date() : null,
      },
    });
  });

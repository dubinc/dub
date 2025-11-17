"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { deletePartnerTagSchema } from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../../safe-action";

// Delete a partner tag
export const deletePartnerTagAction = authActionClient
  .schema(deletePartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerTagId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.partnerTag.delete({
      where: {
        programId,
        id: partnerTagId,
      },
    });
  });

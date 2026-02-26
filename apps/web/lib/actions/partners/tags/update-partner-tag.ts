"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updatePartnerTagSchema } from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../../safe-action";

// Update a partner tag
export const updatePartnerTagAction = authActionClient
  .schema(updatePartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerTagId, name } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    try {
      await prisma.partnerTag.update({
        where: {
          programId,
          id: partnerTagId,
        },
        data: {
          name,
        },
      });
    } catch (e) {
      if (e.code === "P2002")
        throw new Error("A tag with that name already exists.");

      throw e;
    }
  });

"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updatePartnerTagSchema } from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../../safe-action";

// Update a partner tag
export const updatePartnerTagAction = authActionClient
  .inputSchema(updatePartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerTagId, name } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    try {
      const { count } = await prisma.partnerTag.updateMany({
        where: {
          id: partnerTagId,
          programId,
        },
        data: {
          name,
        },
      });

      if (count === 0) {
        throw new Error("Partner tag not found.");
      }
    } catch (e) {
      if (e.code === "P2002")
        throw new Error("A tag with that name already exists.");

      throw e;
    }
  });

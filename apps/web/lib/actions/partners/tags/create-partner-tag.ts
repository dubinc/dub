"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  PartnerTagSchema,
  createPartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../../safe-action";

// Create a partner tag
export const createPartnerTagAction = authActionClient
  .schema(createPartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { name } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    try {
      const partnerTag = await prisma.partnerTag.create({
        data: {
          programId,
          name,
        },
      });

      return {
        partnerTag: PartnerTagSchema.parse(partnerTag),
      };
    } catch (e) {
      if (e.code === "P2002")
        throw new Error("A tag with that name already exists.");

      throw e;
    }
  });

"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  PartnerTagSchema,
  createPartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { INFINITY_NUMBER } from "@dub/utils";
import { authActionClient } from "../../safe-action";

// Create a partner tag
export const createPartnerTagAction = authActionClient
  .schema(createPartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { name } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const partnerTagsLimit = (
      workspace as unknown as { partnerTagsLimit: number }
    ).partnerTagsLimit;

    if (partnerTagsLimit < INFINITY_NUMBER) {
      const existingCount = await prisma.partnerTag.count({
        where: { programId },
      });
      if (existingCount >= partnerTagsLimit) {
        throw new Error(
          partnerTagsLimit === 0
            ? "Partner tags are not available on your plan. Upgrade to create partner tags."
            : `You've reached the maximum of ${partnerTagsLimit} partner tags per program on your plan. Upgrade to Advanced or Enterprise for unlimited partner tags.`,
        );
      }
    }

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

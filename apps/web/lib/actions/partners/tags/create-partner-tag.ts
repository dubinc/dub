"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import {
  PartnerTagSchema,
  createPartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { INFINITY_NUMBER } from "@dub/utils";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";

// Create a partner tag
export const createPartnerTagAction = authActionClient
  .inputSchema(createPartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { name } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (workspace.partnerTagsLimit < INFINITY_NUMBER) {
      const existingCount = await prisma.partnerTag.count({
        where: {
          programId,
        },
      });

      if (existingCount >= workspace.partnerTagsLimit) {
        throw new Error(
          workspace.partnerTagsLimit === 0
            ? "Partner tags are not available on your plan. Upgrade to create partner tags."
            : `You've reached the maximum of ${workspace.partnerTagsLimit} partner tags per program on your plan. Upgrade to Advanced or Enterprise for unlimited partner tags.`,
        );
      }
    }

    try {
      const partnerTag = await prisma.partnerTag.create({
        data: {
          id: createId({ prefix: "ptag_" }),
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

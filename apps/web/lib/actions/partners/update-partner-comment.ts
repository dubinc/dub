"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import {
  PartnerCommentSchema,
  updatePartnerCommentSchema,
} from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

// Update a partner comment
export const updatePartnerCommentAction = authActionClient
  .schema(updatePartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { id, text } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const comment = await prisma.partnerComment.update({
      where: {
        id,
        programId,
        userId: user.id,
      },
      data: {
        text,
      },
      include: {
        user: true,
      },
    });

    return {
      comment: PartnerCommentSchema.parse(comment),
    };
  });

"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { deletePartnerCommentSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

// Delete a partner comment
export const deletePartnerCommentAction = authActionClient
  .schema(deletePartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { commentId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.partnerComment.delete({
      where: {
        id: commentId,
        programId,
      },
    });
  });

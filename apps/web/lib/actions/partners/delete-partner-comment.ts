"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { deletePartnerCommentSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Delete a partner comment
export const deletePartnerCommentAction = authActionClient
  .inputSchema(deletePartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commentId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.partnerComment.delete({
      where: {
        id: commentId,
        programId,
        userId: user.id,
      },
    });
  });

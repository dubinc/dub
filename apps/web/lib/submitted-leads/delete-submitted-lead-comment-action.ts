"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import { deleteSubmittedLeadCommentSchema } from "@/lib/zod/schemas/submitted-leads";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

// Delete a comment on a submitted lead
export const deleteSubmittedLeadCommentAction = authActionClient
  .inputSchema(deleteSubmittedLeadCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commentId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.submittedLeadComment.delete({
      where: {
        id: commentId,
        userId: user.id,
        partnerId: null,
        lead: {
          programId,
        },
      },
    });
  });

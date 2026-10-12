"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import {
  SubmittedLeadCommentSchema,
  updateSubmittedLeadCommentSchema,
} from "@/lib/zod/schemas/submitted-leads";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

// Update a comment on a submitted lead
export const updateSubmittedLeadCommentAction = authActionClient
  .inputSchema(updateSubmittedLeadCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commentId, text } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const comment = await prisma.submittedLeadComment.update({
      where: {
        id: commentId,
        userId: user.id,
        partnerId: null,
        lead: {
          programId,
        },
      },
      data: {
        text,
      },
      include: {
        user: true,
      },
    });

    return {
      comment: SubmittedLeadCommentSchema.parse(comment),
    };
  });

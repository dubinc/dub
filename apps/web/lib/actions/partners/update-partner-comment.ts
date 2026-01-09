"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import {
  PartnerCommentSchema,
  updatePartnerCommentSchema,
} from "../../zod/schemas/programs";
import { throwIfNoPermission } from "../throw-if-no-permission";
import { authActionClient } from "../safe-action";

// Update a partner comment
export const updatePartnerCommentAction = authActionClient
  .inputSchema(updatePartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { id, text } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
      customMessage: "You don't have permission to update partner comments.",
    });

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

"use server";

import {
  parseFraudResolutionComment,
} from "@/lib/fraud-resolution-comment";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import {
  PartnerCommentSchema,
  updatePartnerCommentSchema,
} from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Update a partner comment
export const updatePartnerCommentAction = authActionClient
  .inputSchema(updatePartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { id, text } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    // Preserve fraud resolution metadata from the existing comment
    const existing = await prisma.partnerComment.findUniqueOrThrow({
      where: { id, programId, userId: user.id },
      select: { text: true, metadata: true },
    });

    const parsedLegacy = parseFraudResolutionComment(existing.text);
    const metadata =
      existing.metadata ??
      (parsedLegacy.metadata
        ? {
            source: "fraudResolution",
            groupId: parsedLegacy.metadata.groupId,
            type: parsedLegacy.metadata.type,
          }
        : null);

    const comment = await prisma.partnerComment.update({
      where: {
        id,
        programId,
        userId: user.id,
      },
      data: {
        text,
        metadata,
      },
      include: {
        user: true,
      },
    });

    return {
      comment: PartnerCommentSchema.parse(comment),
    };
  });

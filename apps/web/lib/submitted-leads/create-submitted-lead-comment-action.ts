"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import { getSubmittedLeadOrThrow } from "@/lib/submitted-leads/get-submitted-lead-or-throw";
import { enqueueSubmittedLeadCommentNotification } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
import {
  SubmittedLeadCommentSchema,
  createSubmittedLeadCommentSchema,
} from "@/lib/zod/schemas/submitted-leads";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

// Create a comment on a submitted lead
export const createSubmittedLeadCommentAction = authActionClient
  .inputSchema(createSubmittedLeadCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { leadId, text, partnerVisible } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const lead = await getSubmittedLeadOrThrow({
      leadId,
      programId,
    });

    const comment = await prisma.submittedLeadComment.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        text,
        partnerVisible,
      },
      include: {
        user: true,
      },
    });

    if (partnerVisible) {
      waitUntil(
        enqueueSubmittedLeadCommentNotification({
          recipient: "partner",
          leadId: lead.id,
          comment,
        }),
      );
    }

    return {
      comment: SubmittedLeadCommentSchema.parse(comment),
    };
  });

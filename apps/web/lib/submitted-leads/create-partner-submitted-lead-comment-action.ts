"use server";

import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { enqueueSubmittedLeadCommentNotification } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
import {
  SubmittedLeadCommentSchema,
  createPartnerSubmittedLeadCommentSchema,
} from "@/lib/zod/schemas/submitted-leads";
import { waitUntil } from "@vercel/functions";
import { authPartnerActionClient } from "../actions/safe-action";
import { ACTIVE_ENROLLMENT_STATUSES } from "../zod/schemas/partners";

// Create a comment on a submitted lead as the partner who submitted it
export const createPartnerSubmittedLeadCommentAction = authPartnerActionClient
  .inputSchema(createPartnerSubmittedLeadCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner, user } = ctx;
    const { programId, leadId, text } = parsedInput;

    const lead = await prisma.submittedLead.findUnique({
      where: {
        id: leadId,
        programId,
        partnerId: partner.id,
        programEnrollment: {
          status: {
            in: ACTIVE_ENROLLMENT_STATUSES,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      throw new DubApiError({
        code: "not_found",
        message: "Submitted lead not found.",
      });
    }

    const comment = await prisma.submittedLeadComment.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        partnerId: partner.id,
        text,
        partnerVisible: true,
      },
      include: {
        user: true,
      },
    });

    waitUntil(
      enqueueSubmittedLeadCommentNotification({
        recipient: "program",
        leadId: lead.id,
        comment,
      }),
    );

    return {
      comment: SubmittedLeadCommentSchema.parse(comment),
    };
  });

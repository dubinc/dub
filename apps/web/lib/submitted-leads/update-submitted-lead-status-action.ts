"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  SUBMITTED_LEAD_STATUS_TO_ACTIVITY_ACTION,
  SUBMITTED_LEAD_STATUS_TRANSITIONS,
} from "@/lib/submitted-leads/constants";
import { getSubmittedLeadOrThrow } from "@/lib/submitted-leads/get-submitted-lead-or-throw";
import { markSubmittedLeadClosedWon } from "@/lib/submitted-leads/mark-submitted-lead-closed-won";
import { markSubmittedLeadQualified } from "@/lib/submitted-leads/mark-submitted-lead-qualified";
import { notifySubmittedLeadStatusUpdate } from "@/lib/submitted-leads/notify-submitted-lead-status-update";
import { SubmittedLeadWithCustomer } from "@/lib/types";
import { updateSubmittedLeadStatusSchema } from "@/lib/zod/schemas/submitted-leads";
import { prisma } from "@dub/prisma";
import { SubmittedLeadStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

export const updateSubmittedLeadStatusAction = authActionClient
  .inputSchema(updateSubmittedLeadStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { leadId, status, notes } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const lead = await getSubmittedLeadOrThrow({
      leadId,
      programId,
    });

    if (!SUBMITTED_LEAD_STATUS_TRANSITIONS[lead.status].includes(status)) {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot transition from ${lead.status} to ${status}.`,
      });
    }

    if (lead.status === status) {
      throw new DubApiError({
        code: "bad_request",
        message: "Lead is already in this status.",
      });
    }

    if (status === SubmittedLeadStatus.closedWon && !lead.customer) {
      throw new DubApiError({
        code: "bad_request",
        message: "This lead does not have a customer associated with it.",
      });
    }

    const updatedLead = await prisma.submittedLead.update({
      where: {
        id: lead.id,
        status: lead.status,
      },
      data: {
        status,
      },
      include: {
        customer: true,
      },
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          notifySubmittedLeadStatusUpdate({
            lead,
            notes,
          }),

          trackActivityLog({
            workspaceId: workspace.id,
            programId,
            resourceType: "submittedLead",
            resourceId: lead.id,
            userId: user.id,
            action: SUBMITTED_LEAD_STATUS_TO_ACTIVITY_ACTION[status],
            description: notes,
            changeSet: {
              status: {
                old: lead.status,
                new: updatedLead.status,
              },
            },
          }),

          ...(status === SubmittedLeadStatus.qualified
            ? [
                markSubmittedLeadQualified({
                  workspace,
                  lead: updatedLead,
                  externalId: parsedInput.externalId ?? null,
                }),
              ]
            : []),

          ...(status === SubmittedLeadStatus.closedWon
            ? [
                markSubmittedLeadClosedWon({
                  workspace,
                  lead: updatedLead as SubmittedLeadWithCustomer,
                  saleAmount: parsedInput.saleAmount,
                  stripeCustomerId: parsedInput.stripeCustomerId ?? null,
                }),
              ]
            : []),
        ]);
      })(),
    );
  });

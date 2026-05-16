"use server";

import { getResourceDiff } from "@/lib/api/activity-log/get-resource-diff";
import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getSubmittedLeadOrThrow } from "@/lib/submitted-leads/get-submitted-lead-or-throw";
import { updateSubmittedLeadSchema } from "@/lib/zod/schemas/submitted-leads";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

// Update a submitted lead's details
export const updateSubmittedLeadAction = authActionClient
  .inputSchema(updateSubmittedLeadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { leadId, name, email, company, formData } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const lead = await getSubmittedLeadOrThrow({
      leadId,
      programId,
    });

    const updatedLead = await prisma.submittedLead.update({
      where: {
        id: leadId,
      },
      data: {
        name,
        email,
        company,
        ...(formData && {
          formData: formData as Prisma.InputJsonValue,
        }),
      },
    });

    const diff = getResourceDiff(lead, updatedLead, {
      fields: ["name", "email", "company"],
    });

    if (diff) {
      waitUntil(
        trackActivityLog({
          workspaceId: workspace.id,
          programId,
          resourceType: "submittedLead",
          resourceId: leadId,
          userId: user.id,
          action: "submittedLead.updated",
          changeSet: diff,
        }),
      );
    }
  });

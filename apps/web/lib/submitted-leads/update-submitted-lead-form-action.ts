"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getFeatureFlags } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS } from "@/lib/submitted-leads/constants";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import * as z from "zod/v4";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  referralFormData: submittedLeadFormSchema,
  enabledGroupIds: z.array(z.string()),
});

// Update the submitted lead form and the groups that can submit leads
export const updateSubmittedLeadFormAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralFormData, enabledGroupIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const flags = await getFeatureFlags({ workspaceId: workspace.id });

    if (!flags.submittedLeads) {
      throw new Error("Submitted leads are not enabled on your workspace.");
    }

    if (
      referralFormData.fields.some(({ key }) =>
        SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS.has(key),
      )
    ) {
      throw new Error("Custom fields can't use the keys of required fields.");
    }

    // There is one form for now, so every group gets the same copy. Groups
    // that are turned off keep it too, so turning them on again needs no edit.
    await prisma.$transaction([
      prisma.partnerGroup.updateMany({
        where: {
          programId,
        },
        data: {
          referralFormData,
        },
      }),
      prisma.partnerGroup.updateMany({
        where: {
          programId,
          id: {
            in: enabledGroupIds,
          },
          submittedLeadsEnabledAt: null,
        },
        data: {
          submittedLeadsEnabledAt: new Date(),
        },
      }),
      prisma.partnerGroup.updateMany({
        where: {
          programId,
          id: {
            notIn: enabledGroupIds,
          },
        },
        data: {
          submittedLeadsEnabledAt: null,
        },
      }),
    ]);
  });

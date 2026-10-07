"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getFeatureFlags } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS } from "@/lib/submitted-leads/constants";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  submittedLeadFormData: submittedLeadFormSchema,
  // Only the groups whose switch changed. All other groups keep their setting.
  enabledGroupIds: z.array(z.string()),
  disabledGroupIds: z.array(z.string()),
});

// Update the submitted lead form and the groups that can submit leads
export const updateSubmittedLeadFormAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submittedLeadFormData, enabledGroupIds, disabledGroupIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["groups.write"],
    });

    const flags = await getFeatureFlags({ workspaceId: workspace.id });

    if (!flags.submittedLeads) {
      throw new Error("Submitted leads are not enabled on your workspace.");
    }

    if (
      submittedLeadFormData.fields.some(({ key }) =>
        SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS.has(key),
      )
    ) {
      throw new Error("Custom fields can't use the keys of required fields.");
    }

    // The groups to record in the audit log, before the update
    const groups = await prisma.partnerGroup.findMany({
      where: {
        programId,
        OR: [
          {
            id: {
              in: [...enabledGroupIds, ...disabledGroupIds],
            },
          },
          {
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        clickRewardId: true,
        leadRewardId: true,
        saleRewardId: true,
        discountId: true,
        submittedLeadFormData: true,
        submittedLeadsEnabledAt: true,
      },
    });

    // There is one form for now, so every group gets the same copy. Groups
    // that are turned off keep it too, so turning them on again needs no edit.
    await prisma.$transaction([
      prisma.partnerGroup.updateMany({
        where: {
          programId,
        },
        data: {
          submittedLeadFormData,
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
            in: disabledGroupIds,
          },
        },
        data: {
          submittedLeadsEnabledAt: null,
        },
      }),
    ]);

    const auditLogs = groups.flatMap(
      ({
        submittedLeadFormData: oldSubmittedLeadFormData,
        submittedLeadsEnabledAt,
        ...group
      }) => {
        const descriptions: string[] = [];

        if (enabledGroupIds.includes(group.id) && !submittedLeadsEnabledAt) {
          descriptions.push(
            `Submitted leads turned on for group ${group.name}`,
          );
        }

        if (disabledGroupIds.includes(group.id) && submittedLeadsEnabledAt) {
          descriptions.push(
            `Submitted leads turned off for group ${group.name}`,
          );
        }

        // The form is the same on every group, so log a form change only once.
        // Parse the old form so both forms have their keys in the same order.
        if (
          group.slug === DEFAULT_PARTNER_GROUP.slug &&
          JSON.stringify(
            submittedLeadFormSchema.safeParse(oldSubmittedLeadFormData).data,
          ) !== JSON.stringify(submittedLeadFormData)
        ) {
          descriptions.push("Submitted lead form updated for all groups");
        }

        return descriptions.map((description) => ({
          workspaceId: workspace.id,
          programId,
          action: "group.updated" as const,
          description,
          actor: user,
          targets: [
            {
              type: "group" as const,
              id: group.id,
              metadata: group,
            },
          ],
        }));
      },
    );

    if (auditLogs.length > 0) {
      waitUntil(recordAuditLog(auditLogs));
    }
  });

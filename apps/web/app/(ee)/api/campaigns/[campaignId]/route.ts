import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { isScheduledWorkflow } from "@/lib/api/workflows/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  CampaignSchema,
  updateCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import {
  WORKFLOW_ATTRIBUTE_TRIGGER,
  WORKFLOW_SCHEDULES,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, arrayEqual } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId] - get an email campaign
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await getCampaignOrThrow({
      programId,
      campaignId,
      includeWorkflow: true,
      includeGroups: true,
    });

    const parsedCampaign = CampaignSchema.parse({
      ...campaign,
      groups: campaign.groups.map(({ groupId }) => ({ id: groupId })),
      triggerCondition: campaign.workflow?.triggerConditions?.[0],
    });

    return NextResponse.json(parsedCampaign);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

// PATCH /api/campaigns/[campaignId] - update an email campaign
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { name, subject, status, bodyJson, groupIds, triggerCondition } =
      updateCampaignSchema.parse(await parseRequestBody(req));

    const campaign = await getCampaignOrThrow({
      programId,
      campaignId,
      includeWorkflow: true,
      includeGroups: true,
    });

    // if groupIds is provided and is different from the current groupIds, update the groups
    let updatedPartnerGroups: PartnerGroup[] | undefined = undefined;
    let shouldUpdateGroups = false;

    if (groupIds !== undefined) {
      const currentGroupIds = campaign.groups.map(({ groupId }) => groupId);
      const newGroupIds = groupIds || []; // treat null as empty array (all groups)

      if (!arrayEqual(currentGroupIds, newGroupIds)) {
        if (newGroupIds.length > 0) {
          updatedPartnerGroups = await throwIfInvalidGroupIds({
            programId,
            groupIds: newGroupIds,
          });
        }

        shouldUpdateGroups = true;
      }
    }

    const updatedCampaign = await prisma.$transaction(async (tx) => {
      if (campaign.workflowId) {
        await tx.workflow.update({
          where: {
            id: campaign.workflowId,
          },
          data: {
            ...(triggerCondition && {
              triggerConditions: [triggerCondition],
              trigger: WORKFLOW_ATTRIBUTE_TRIGGER[triggerCondition.attribute],
            }),
            ...(status && {
              disabledAt: status === "paused" ? new Date() : null,
            }),
          },
        });
      }

      return await tx.campaign.update({
        where: {
          id: campaignId,
          programId,
        },
        data: {
          ...(name && { name }),
          ...(subject && { subject }),
          ...(status && { status }),
          ...(bodyJson && { bodyJson }),
          ...(shouldUpdateGroups && {
            groups: {
              deleteMany: {},
              ...(updatedPartnerGroups &&
                updatedPartnerGroups.length > 0 && {
                  create: updatedPartnerGroups.map((group) => ({
                    groupId: group.id,
                  })),
                }),
            },
          }),
        },
        include: {
          groups: true,
          workflow: true,
        },
      });
    });

    waitUntil(
      (async () => {
        if (
          !updatedCampaign.workflow ||
          !isScheduledWorkflow(updatedCampaign.workflow)
        ) {
          return;
        }

        // Decide whether to schedule the workflow or delete the schedule
        const shouldSchedule =
          (campaign.status === "draft" || campaign.status === "paused") &&
          updatedCampaign.status === "active";

        const shouldDeleteSchedule =
          campaign.status === "active" && updatedCampaign.status === "paused";

        const cronSchedule =
          WORKFLOW_SCHEDULES[updatedCampaign.workflow.trigger];

        if (!cronSchedule) {
          throw new Error(
            `Cron schedule not found for trigger ${updatedCampaign.workflow.trigger}`,
          );
        }

        if (shouldSchedule) {
          await qstash.schedules.create({
            destination: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${updatedCampaign.workflow.id}`,
            cron: cronSchedule,
            scheduleId: updatedCampaign.workflow.id,
          });
        } else if (shouldDeleteSchedule) {
          await qstash.schedules.delete(updatedCampaign.workflow.id);
        }
      })(),
    );

    const response = CampaignSchema.parse({
      ...updatedCampaign,
      groups: updatedCampaign.groups.map(({ groupId }) => ({ id: groupId })),
      triggerCondition: updatedCampaign.workflow?.triggerConditions?.[0],
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

// DELETE /api/campaigns/[campaignId] - delete a campaign
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await getCampaignOrThrow({
      programId,
      campaignId,
      includeWorkflow: true,
    });

    await prisma.$transaction(async (tx) => {
      await tx.campaign.delete({
        where: {
          id: campaignId,
        },
      });

      if (campaign.workflowId) {
        await tx.workflow.delete({
          where: {
            id: campaign.workflowId,
          },
        });
      }
    });

    waitUntil(
      (async () => {
        if (!campaign.workflow) {
          return;
        }

        const { condition } = parseWorkflowConfig(campaign.workflow);

        if (condition.attribute === "partnerJoined") {
          return;
        }

        await qstash.schedules.delete(campaign.workflow.id);
      })(),
    );

    return NextResponse.json({ id: campaignId });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import {
  scheduleMarketingCampaign,
  scheduleTransactionalCampaign,
} from "@/lib/api/campaigns/schedule-campaigns";
import { validateCampaign } from "@/lib/api/campaigns/validate-campaign";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  CampaignSchema,
  updateCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import { WORKFLOW_ATTRIBUTE_TRIGGER } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { PartnerGroup } from "@dub/prisma/client";
import { arrayEqual } from "@dub/utils";
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
    requiredRoles: ["owner", "member"],
  },
);

// PATCH /api/campaigns/[campaignId] - update an email campaign
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await getCampaignOrThrow({
      programId,
      campaignId,
      includeWorkflow: true,
      includeGroups: true,
    });

    const {
      name,
      subject,
      preview,
      from,
      status,
      bodyJson,
      groupIds,
      triggerCondition,
      scheduledAt,
    } = await validateCampaign({
      input: updateCampaignSchema.parse(await parseRequestBody(req)),
      campaign,
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
          ...(preview !== undefined && { preview }),
          ...(from && { from }),
          ...(status && { status }),
          ...(bodyJson && { bodyJson }),
          ...(scheduledAt !== undefined && { scheduledAt }),
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
        if (updatedCampaign.type === "marketing") {
          await scheduleMarketingCampaign({
            campaign,
            updatedCampaign,
          });
        } else if (updatedCampaign.type === "transactional") {
          await scheduleTransactionalCampaign({
            campaign,
            updatedCampaign,
          });
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
    requiredRoles: ["owner", "member"],
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
        if (campaign.type === "marketing" && campaign.qstashMessageId) {
          await qstash.messages.delete(campaign.qstashMessageId);
        } else if (campaign.type === "transactional" && campaign.workflow) {
          const { condition } = parseWorkflowConfig(campaign.workflow);

          if (condition.attribute === "partnerJoined") {
            return;
          }

          await qstash.schedules.delete(campaign.workflow.id);
        }
      })(),
    );

    return NextResponse.json({ id: campaignId });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);

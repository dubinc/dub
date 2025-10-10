import { createId } from "@/lib/api/create-id";
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
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ATTRIBUTE_TRIGGER,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { CampaignStatus, CampaignType, Workflow } from "@dub/prisma/client";
import { arrayEqual } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId] - get an email campaign
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
      include: {
        groups: true,
        workflow: true,
      },
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

    const {
      type,
      name,
      subject,
      status,
      bodyJson,
      groupIds,
      triggerCondition,
    } = updateCampaignSchema.parse(await parseRequestBody(req));

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
      include: {
        groups: true,
        workflow: true,
      },
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

    // TODO
    // When pausing we need to disable the workflow
    // When resuming we need to enable the workflow
    // Update the workflow

    // validateCampaign({
    //   ...campaign,
    //   ...(type && { type }),
    //   ...(name && { name }),
    //   ...(subject && { subject }),
    //   ...(status && { status }),
    //   ...(bodyJson && { bodyJson }),
    //   ...(triggerCondition && { triggerCondition }),
    // });

    const updatedCampaign = await prisma.$transaction(async (tx) => {
      let workflow: Workflow | null = null;

      if (
        status === CampaignStatus.draft &&
        campaign.type === CampaignType.transactional &&
        triggerCondition
      ) {
        const trigger = WORKFLOW_ATTRIBUTE_TRIGGER[triggerCondition.attribute];
        const triggerConditions = [triggerCondition];
        const actions = [
          { type: WORKFLOW_ACTION_TYPES.SendCampaign, data: { campaignId } },
        ];

        if (campaign.workflowId) {
          // Update existing workflow
          workflow = await tx.workflow.update({
            where: {
              id: campaign.workflowId,
            },
            data: {
              triggerConditions,
              trigger,
              actions,
            },
          });
        } else {
          // Create new workflow
          workflow = await tx.workflow.create({
            data: {
              id: createId({ prefix: "wf_" }),
              programId,
              triggerConditions,
              trigger,
              actions,
            },
          });
        }
      }

      return await tx.campaign.update({
        where: {
          id: campaignId,
          programId,
        },
        data: {
          ...(type && { type }),
          ...(name && { name }),
          ...(subject && { subject }),
          ...(status && { status }),
          ...(bodyJson && { bodyJson }),
          ...(workflow && { workflowId: workflow.id }),
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

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
      include: {
        workflow: true,
      },
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

        // Skip scheduling if the condition is not based on partnerEnrolledDays,
        // or if the required enrolled days is 0 (immediate execution case)
        if (
          condition.attribute !== "partnerEnrolledDays" ||
          condition.value === 0
        ) {
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

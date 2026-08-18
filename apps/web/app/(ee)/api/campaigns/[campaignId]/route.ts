import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import {
  campaignEligibilityIncludes,
  transformCampaign,
} from "@/lib/api/campaigns/transform-campaign";
import { validateCampaign } from "@/lib/api/campaigns/validate-campaign";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { throwIfInvalidPartnerTagIds } from "@/lib/api/partner-tags/throw-if-invalid-partner-tag-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { validateWorkflowConditions } from "@/lib/api/workflows/validate-workflow-conditions";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CampaignSchema,
  updateCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import { arrayEqual, pluck } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId] - get an email campaign
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await getCampaignOrThrow({
      programId,
      campaignId,
      include: {
        ...campaignEligibilityIncludes,
        workflow: {
          select: {
            triggerConditions: true,
          },
        },
      },
    });

    return NextResponse.json(CampaignSchema.parse(transformCampaign(campaign)));
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
      include: {
        ...campaignEligibilityIncludes,
        workflow: {
          select: {
            triggerConditions: true,
          },
        },
      },
    });

    const {
      name,
      subject,
      preview,
      from,
      status,
      bodyJson,
      groupIds,
      partnerTagIds,
      triggerConditions,
      scheduledAt,
    } = await validateCampaign({
      input: updateCampaignSchema.parse(await parseRequestBody(req)),
      campaign,
    });

    if (triggerConditions !== undefined && triggerConditions?.length) {
      await validateWorkflowConditions({
        conditions: triggerConditions,
        workflowType: "sendCampaign",
      });
    }

    // if groupIds is provided and is different from the current groupIds, update the groups
    let updatedPartnerGroups: PartnerGroup[] | undefined = undefined;
    let shouldUpdateGroups = false;
    let updatedPartnerTags: { id: string }[] | undefined = undefined;
    let shouldUpdatePartnerTags = false;

    if (groupIds !== undefined) {
      const currentGroupIds = pluck(campaign.groups, "groupId");
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

    if (partnerTagIds !== undefined) {
      const currentPartnerTagIds = pluck(campaign.partnerTags, "partnerTagId");
      const newPartnerTagIds = partnerTagIds || []; // treat null as empty array (no tag restriction)

      if (!arrayEqual(currentPartnerTagIds, newPartnerTagIds)) {
        if (newPartnerTagIds.length > 0) {
          updatedPartnerTags = await throwIfInvalidPartnerTagIds({
            programId,
            partnerTagIds: newPartnerTagIds,
          });
        }

        shouldUpdatePartnerTags = true;
      }
    }

    const updatedCampaign = await prisma.$transaction(async (tx) => {
      if (campaign.workflowId) {
        await tx.workflow.update({
          where: {
            id: campaign.workflowId,
          },
          data: {
            ...(triggerConditions !== undefined && {
              triggerConditions: triggerConditions ?? [],
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
          ...(shouldUpdatePartnerTags && {
            partnerTags: {
              deleteMany: {},
              ...(updatedPartnerTags &&
                updatedPartnerTags.length > 0 && {
                  create: updatedPartnerTags.map((tag) => ({
                    partnerTagId: tag.id,
                  })),
                }),
            },
          }),
        },
        include: {
          ...campaignEligibilityIncludes,
          workflow: true,
        },
      });
    });

    return NextResponse.json(
      CampaignSchema.parse(transformCampaign(updatedCampaign)),
    );
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

    return NextResponse.json({ id: campaignId });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);

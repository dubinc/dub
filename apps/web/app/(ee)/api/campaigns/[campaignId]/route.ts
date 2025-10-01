import { validateCampaign } from "@/lib/api/campaigns/validate-campaign";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  CampaignSchema,
  updateCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
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
  },
);

// PATCH /api/campaigns/[campaignId] - update an email campaign
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { type, name, subject, status, body, triggerCondition } =
      updateCampaignSchema.parse(await parseRequestBody(req));

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

    validateCampaign({
      ...campaign,
      ...(type && { type }),
      ...(name && { name }),
      ...(subject && { subject }),
      ...(status && { status }),
      ...(body && { body }),
      ...(triggerCondition && { triggerCondition }),
    });

    // TODO:
    // Update the workflow

    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaignId,
        programId,
      },
      data: {
        ...(type && { type }),
        ...(name && { name }),
        ...(subject && { subject }),
        ...(status && { status }),
        ...(body && { body }),
      },
      include: {
        groups: true,
        workflow: true,
      },
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
  },
);

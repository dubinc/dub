import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
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

    const fetchtedCampaign = CampaignSchema.parse({
      ...campaign,
      groups: campaign.groups.map(({ groupId }) => ({ id: groupId })),
      triggerCondition: campaign.workflow?.triggerConditions?.[0],
    });

    return NextResponse.json(fetchtedCampaign);
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

    return NextResponse.json({ id: programId });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

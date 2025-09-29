import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { CampaignSchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
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

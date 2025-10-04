import { getCampaignSummary } from "@/lib/api/campaigns/get-campaign-summary";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/summary
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
    });

    const metrics = await getCampaignSummary(campaignId);

    return NextResponse.json(metrics);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

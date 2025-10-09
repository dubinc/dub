import { getCampaignSummary } from "@/lib/api/campaigns/get-campaign-summary";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/summary
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });
    if (!program.campaignsEnabledAt)
      throw new DubApiError({
        code: "forbidden",
        message: "Campaigns are not enabled for this program.",
      });

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

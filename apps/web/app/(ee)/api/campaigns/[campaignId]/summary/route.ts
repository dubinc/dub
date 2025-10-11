import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { getCampaignSummary } from "@/lib/api/campaigns/get-campaign-summary";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/summary
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await getCampaignOrThrow({
      programId,
      campaignId,
    });

    const metrics = await getCampaignSummary(campaignId);

    return NextResponse.json(metrics);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RewardfulApi } from "../importer";

const schema = z.object({
  apiKey: z.string(),
  campaignId: z.string(),
});

// GET /api/programs/[programId]/rewardful/campaigns - list rewardful campaigns
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const rewardfulApi = new RewardfulApi({ programId });
  const campaigns = await rewardfulApi.listCampaigns();

  return NextResponse.json(campaigns);
});

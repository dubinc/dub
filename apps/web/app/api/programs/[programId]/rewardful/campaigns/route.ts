import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { RewardfulApi } from "@/lib/rewardful/api";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewardful/campaigns - list rewardful campaigns
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const rewardfulApi = new RewardfulApi({ programId });

  return NextResponse.json(await rewardfulApi.listCampaigns());
});

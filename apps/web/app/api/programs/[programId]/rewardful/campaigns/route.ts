import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { RewardfulApi } from "@/lib/rewardful/api";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewardful/campaigns - list rewardful campaigns
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const { token } = await rewardfulImporter.getCredentials(programId);
  const rewardfulApi = new RewardfulApi({ token });
  const campaigns = await rewardfulApi.listCampaigns();

  return NextResponse.json(campaigns);
});

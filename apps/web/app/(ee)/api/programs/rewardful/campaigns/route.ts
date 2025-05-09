import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { RewardfulApi } from "@/lib/rewardful/api";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { NextResponse } from "next/server";

// GET /api/programs/rewardful/campaigns - list rewardful campaigns
export const GET = withWorkspace(async ({ workspace }) => {
  if (!workspace.partnersEnabled) {
    throw new DubApiError({
      code: "forbidden",
      message: "Partners are not enabled for this workspace",
    });
  }

  const { token } = await rewardfulImporter.getCredentials(workspace.id);
  const rewardfulApi = new RewardfulApi({ token });

  return NextResponse.json(await rewardfulApi.listCampaigns());
});

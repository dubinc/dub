import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { FirstPromoterApi } from "@/lib/firstpromoter/api";
import { firstPromoterImporter } from "@/lib/firstpromoter/importer";
import { NextResponse } from "next/server";

// GET /api/programs/firstpromoter/campaigns - list FirstPromoter campaigns
export const GET = withWorkspace(async ({ workspace }) => {
  const credentials = await firstPromoterImporter.getCredentials(workspace.id);

  if (!credentials) {
    throw new DubApiError({
      code: "bad_request",
      message: "FirstPromoter credentials not found.",
    });
  }

  const firstPromoterApi = new FirstPromoterApi(credentials);

  const campaigns = await firstPromoterApi.listCampaigns();
  const campaignsFormatted = campaigns.map(({ campaign }) => campaign);

  return NextResponse.json(campaignsFormatted);
});

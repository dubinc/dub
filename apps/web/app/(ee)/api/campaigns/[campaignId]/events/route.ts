import { getCampaignEvents } from "@/lib/api/campaigns/get-campaign-events";
import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCampaignsEventsQuerySchema } from "@/lib/zod/schemas/campaigns";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/events
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await getCampaignOrThrow({
      programId,
      campaignId,
    });

    const events = await getCampaignEvents({
      ...getCampaignsEventsQuerySchema.parse(searchParams),
      campaignId,
    });

    return NextResponse.json(events);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

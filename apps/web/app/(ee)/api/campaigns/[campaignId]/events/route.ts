import { getCampaignEvents } from "@/lib/api/campaigns/get-campaign-events";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCampaignsEventsQuerySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/events
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.campaign.findUniqueOrThrow({
      where: {
        id: campaignId,
        programId,
      },
    });

    const filters = {
      ...getCampaignsEventsQuerySchema.parse(searchParams),
      campaignId,
    };

    const events = await getCampaignEvents(filters);

    return NextResponse.json(events);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

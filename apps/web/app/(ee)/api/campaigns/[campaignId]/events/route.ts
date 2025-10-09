import { getCampaignEvents } from "@/lib/api/campaigns/get-campaign-events";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCampaignsEventsQuerySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/events
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
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

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCampaignEventsCountQuerySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/events/count
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

    const { status, search } =
      getCampaignEventsCountQuerySchema.parse(searchParams);

    const count = await prisma.notificationEmail.count({
      where: {
        campaignId,
        ...(status === "delivered" && { deliveredAt: { not: null } }),
        ...(status === "opened" && { openedAt: { not: null } }),
        ...(status === "bounced" && { bouncedAt: { not: null } }),
        ...(search && {
          partner: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          },
        }),
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

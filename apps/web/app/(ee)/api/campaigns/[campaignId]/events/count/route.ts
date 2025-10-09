import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCampaignEventsCountQuerySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/campaigns/[campaignId]/events/count
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
  },
);

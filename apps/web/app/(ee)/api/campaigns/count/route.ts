import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCampaignsCountQuerySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { CampaignStatus, CampaignType, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/campaigns/count - get the count of campaigns for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { type, status, groupBy, search } =
      getCampaignsCountQuerySchema.parse(searchParams);

    const commonWhere: Prisma.CampaignWhereInput = {
      programId,
      type,
      status,
      ...(search && {
        OR: [{ name: { contains: search } }, { subject: { contains: search } }],
      }),
    };

    // Group by the type of campaign
    if (groupBy === "type") {
      const campaigns = await prisma.campaign.groupBy({
        by: ["type"],
        where: {
          ...commonWhere,
        },
        _count: true,
        orderBy: {
          _count: {
            type: "desc",
          },
        },
      });

      Object.values(CampaignType).forEach((type) => {
        if (!campaigns.some((c) => c.type === type)) {
          campaigns.push({ _count: 0, type });
        }
      });

      return NextResponse.json(campaigns);
    }

    // Group by the status of campaign
    if (groupBy === "status") {
      const campaigns = await prisma.campaign.groupBy({
        by: ["status"],
        where: {
          ...commonWhere,
        },
        _count: true,
        orderBy: {
          _count: {
            status: "desc",
          },
        },
      });

      Object.values(CampaignStatus).forEach((status) => {
        if (!campaigns.some((c) => c.status === status)) {
          campaigns.push({ _count: 0, status });
        }
      });

      return NextResponse.json(campaigns);
    }

    // Get the absolute count of campaigns
    const count = await prisma.campaign.count({
      where: {
        ...commonWhere,
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  CampaignListSchema,
  createCampaignSchema,
  getCampaignsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/campaigns - get all email campaigns for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { sortBy, sortOrder, status, search, type } =
      getCampaignsQuerySchema.parse(searchParams);

    const campaigns = await prisma.campaign.findMany({
      where: {
        programId,
        ...(status && { status }),
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { subject: { contains: search } },
          ],
        }),
      },
      include: {
        groups: {
          select: {
            groupId: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const data = campaigns.map((campaign) => {
      return {
        ...campaign,
        partners: 0,
        delivered: 0,
        bounced: 0,
        opened: 0,
      };
    });

    return NextResponse.json(z.array(CampaignListSchema).parse(data));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// POST /api/campaigns - create a draft email campaign
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { type } = createCampaignSchema.parse(await parseRequestBody(req));

    const campaign = await prisma.campaign.create({
      data: {
        id: createId({ prefix: "cmp_" }),
        programId,
        userId: session.user.id,
        status: "draft",
        name: "Untitled",
        subject: "",
        body: "",
        type,
      },
    });

    return NextResponse.json({
      id: campaign.id,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

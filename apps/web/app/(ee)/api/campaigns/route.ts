import { DEFAULT_CAMPAIGN_BODY } from "@/lib/api/campaigns";
import { getCampaigns } from "@/lib/api/campaigns/get-campaigns";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createCampaignSchema,
  getCampaignsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { CampaignStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/campaigns - get all email campaigns for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaigns = await getCampaigns({
      ...getCampaignsQuerySchema.parse(searchParams),
      programId,
    });

    return NextResponse.json(campaigns);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

// POST /api/campaigns - create a draft email campaign
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { type } = createCampaignSchema.parse(await parseRequestBody(req));

    const campaign = await prisma.campaign.create({
      data: {
        id: createId({ prefix: "cmp_" }),
        programId,
        userId: session.user.id,
        status: CampaignStatus.draft,
        name: "Untitled",
        subject: "",
        body: DEFAULT_CAMPAIGN_BODY,
        type,
      },
    });

    return NextResponse.json({
      id: campaign.id,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);

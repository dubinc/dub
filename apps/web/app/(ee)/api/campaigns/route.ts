import { DEFAULT_CAMPAIGN_BODY } from "@/lib/api/campaigns/constants";
import {
  campaignEligibilityIncludes,
  transformCampaign,
} from "@/lib/api/campaigns/transform-campaign";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { WorkflowAction, WorkflowCondition } from "@/lib/api/workflows/types";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CampaignSchema,
  createCampaignSchema,
  getCampaignsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { CampaignStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/campaigns - get all email campaigns for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      type,
      status,
      search,
      triggerConditions,
      page = 1,
      pageSize,
    } = getCampaignsQuerySchema.parse(searchParams);

    const campaigns = await prisma.campaign.findMany({
      where: {
        programId,
        type,
        status,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { subject: { contains: search } },
          ],
        }),
        ...(triggerConditions && {
          workflow: {
            triggerConditions: {
              equals: triggerConditions,
            },
          },
        }),
      },
      include: {
        ...campaignEligibilityIncludes,
        workflow: {
          select: {
            triggerConditions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(
      z.array(CampaignSchema).parse(campaigns.map(transformCampaign)),
    );
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

    const campaign = await prisma.$transaction(async (tx) => {
      const campaignId = createId({ prefix: "cmp_" });
      const workflowId = createId({ prefix: "wf_" });

      const campaign = await tx.campaign.create({
        data: {
          id: campaignId,
          programId,
          userId: session.user.id,
          status: CampaignStatus.draft,
          name: "Untitled",
          subject: "",
          bodyJson: DEFAULT_CAMPAIGN_BODY,
          type,
          ...(type === "transactional" && { workflowId }),
        },
      });

      if (type === "transactional") {
        const triggerCondition: WorkflowCondition = {
          attribute: "partnerJoined",
          operator: "gte",
          value: 0,
        };

        const action: WorkflowAction = {
          type: WORKFLOW_ACTION_TYPES.SendCampaign,
          data: {
            campaignId,
          },
        };

        await tx.workflow.create({
          data: {
            id: workflowId,
            programId,
            triggerConditions: [triggerCondition],
            actions: [action],
            disabledAt: new Date(), // TODO: Replace this with publishedAt
          },
        });
      }

      return campaign;
    });

    return NextResponse.json(
      {
        id: campaign.id,
      },
      { status: 201 },
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);

import { DEFAULT_CAMPAIGN_BODY } from "@/lib/api/campaigns/constants";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { WorkflowAction, WorkflowCondition } from "@/lib/types";
import {
  CampaignSchema,
  createCampaignSchema,
  getCampaignsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ATTRIBUTE_TRIGGER,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { CampaignStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/campaigns - get all email campaigns for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { type, status, search, triggerCondition, page, pageSize } =
      getCampaignsQuerySchema.parse(searchParams);

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
        ...(triggerCondition && {
          workflow: {
            triggerConditions: {
              equals: [triggerCondition],
            },
          },
        }),
      },
      include: {
        groups: true,
        workflow: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(
      campaigns.map((campaign) =>
        CampaignSchema.parse({
          ...campaign,
          groups: campaign.groups.map(({ groupId }) => ({ id: groupId })),
          triggerCondition: campaign.workflow?.triggerConditions?.[0],
        }),
      ),
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
        const trigger = WORKFLOW_ATTRIBUTE_TRIGGER["partnerJoined"];

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
            trigger,
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
  },
);

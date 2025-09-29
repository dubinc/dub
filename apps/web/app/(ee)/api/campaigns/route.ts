import { validateCampaign } from "@/lib/api/campaigns/validate-campaign";
import { createId } from "@/lib/api/create-id";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { WorkflowAction } from "@/lib/types";
import {
  CampaignSchema,
  createCampaignSchema,
  getCampaignsQuerySchema,
} from "@/lib/zod/schemas/campaigns";
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ATTRIBUTE_TRIGGER_MAP,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Workflow } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/campaigns - get all email campaigns for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { sortBy, sortOrder, status, search } =
      getCampaignsQuerySchema.parse(searchParams);

    const campaigns = await prisma.campaign.findMany({
      where: {
        programId,
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { subject: { contains: search } },
          ],
        }),
      },
      include: {
        workflow: {
          select: {
            id: true,
            triggerConditions: true,
          },
        },
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
        groups: campaign.groups.map(({ groupId }) => ({ id: groupId })),
        triggerCondition: campaign.workflow?.triggerConditions?.[0],
      };
    });

    return NextResponse.json(z.array(CampaignSchema).parse(data));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// POST /api/campaigns - create an email campaign
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { name, subject, body, type, groupIds, triggerCondition } =
      createCampaignSchema.parse(await parseRequestBody(req));

    const partnerGroups = await throwIfInvalidGroupIds({
      programId,
      groupIds,
    });

    validateCampaign({
      type,
      triggerCondition,
    });

    const campaign = await prisma.$transaction(async (tx) => {
      let workflow: Workflow | null = null;
      const campaignId = createId({ prefix: "cmp_" });

      // Create a workflow for the transactional campaigns
      if (type === "transactional" && triggerCondition) {
        const action: WorkflowAction = {
          type: WORKFLOW_ACTION_TYPES.SendCampaign,
          data: {
            campaignId,
          },
        };

        const trigger =
          WORKFLOW_ATTRIBUTE_TRIGGER_MAP[triggerCondition.attribute];

        workflow = await tx.workflow.create({
          data: {
            id: createId({ prefix: "wf_" }),
            programId,
            trigger,
            triggerConditions: [triggerCondition],
            actions: [action],
          },
        });
      }

      return await tx.campaign.create({
        data: {
          id: campaignId,
          programId,
          workflowId: workflow?.id,
          name,
          subject,
          body,
          status: "draft",
          type,
          userId: session.user.id,
          ...(partnerGroups.length && {
            groups: {
              createMany: {
                data: partnerGroups.map(({ id }) => ({
                  groupId: id,
                })),
              },
            },
          }),
        },
        include: {
          workflow: true,
          groups: true,
        },
      });
    });

    const createdCampaign = CampaignSchema.parse({
      ...campaign,
      groups: campaign.groups.map(({ groupId }) => ({ id: groupId })),
      triggerCondition: campaign.workflow?.triggerConditions?.[0],
    });

    waitUntil(
      (async () => {
        if (!campaign.workflow) {
          return;
        }

        const { condition } = parseWorkflowConfig(campaign.workflow);

        // Skip scheduling if the condition is not based on partnerEnrolledDays,
        // or if the required enrolled days is 0 (immediate execution case)
        if (
          condition.attribute !== "partnerEnrolledDays" ||
          condition.value === 0
        ) {
          return;
        }

        await qstash.schedules.create({
          destination: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${campaign.workflow.id}`,
          cron: "0 */12 * * *", // Every 12 hours
          scheduleId: campaign.workflow.id,
        });
      })(),
    );

    return NextResponse.json(createdCampaign);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { WorkflowAction } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { BountySchema, createBountySchema } from "@/lib/zod/schemas/bounties";
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ATTRIBUTE_TRIGGER_MAP,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/bounties - get all bounties for a program
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const bounties = await prisma.bounty.findMany({
      where: {
        programId,
      },
      include: {
        groups: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    return NextResponse.json(
      bounties.map((bounty) =>
        BountySchema.parse({
          ...bounty,
          submissionsCount: bounty._count.submissions,
        }),
      ),
    );
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// POST /api/bounties - create a bounty
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      name,
      description,
      type,
      rewardAmount,
      startsAt,
      endsAt,
      submissionRequirements,
      groupIds,
      performanceCondition,
    } = createBountySchema.parse(await parseRequestBody(req));

    if (startsAt && endsAt && endsAt < startsAt) {
      throw new DubApiError({
        message: "endsAt must be on or after startsAt.",
        code: "bad_request",
      });
    }

    const groups = groupIds?.length
      ? await prisma.partnerGroup.findMany({
          where: {
            programId,
            id: {
              in: groupIds,
            },
          },
        })
      : null;

    const bounty = await prisma.$transaction(async (tx) => {
      let workflow: Workflow | null = null;
      const bountyId = createId({ prefix: "bnty_" });

      // Create a workflow if there is a performance condition
      if (performanceCondition && type === "performance") {
        const action: WorkflowAction = {
          type: WORKFLOW_ACTION_TYPES.AwardBounty,
          data: {
            bountyId,
          },
        };

        workflow = await tx.workflow.create({
          data: {
            id: createId({ prefix: "wf_" }),
            programId,
            trigger:
              WORKFLOW_ATTRIBUTE_TRIGGER_MAP[performanceCondition.attribute],
            triggerConditions: [performanceCondition],
            actions: [action],
          },
        });
      }

      // Create a bounty
      const bounty = await tx.bounty.create({
        data: {
          id: bountyId,
          programId,
          workflowId: workflow?.id,
          name,
          description,
          type,
          startsAt: startsAt!, // Can remove the ! when we're on a newer TS version (currently 5.4.4)
          endsAt,
          rewardAmount,
          ...(submissionRequirements &&
            type === "submission" && {
              submissionRequirements,
            }),
          ...(groups?.length && {
            groups: {
              createMany: {
                data: groups.map(({ id }) => ({
                  groupId: id,
                })),
              },
            },
          }),
        },
      });

      return {
        ...bounty,
        performanceCondition,
      };
    });

    waitUntil(
      Promise.allSettled([
        sendWorkspaceWebhook({
          workspace,
          trigger: "bounty.created",
          data: BountySchema.parse(bounty),
        }),

        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/published`,
          body: {
            bountyId: bounty.id,
            page: 1,
          },
        }),
      ]),
    );

    return NextResponse.json(BountySchema.parse(bounty));
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

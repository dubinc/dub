import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { generateBountyName } from "@/lib/api/bounties/generate-bounty-name";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { WorkflowAction } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  BountyListSchema,
  BountySchema,
  createBountySchema,
} from "@/lib/zod/schemas/bounties";
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
            groupId: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    const data = bounties.map((bounty) =>
      BountyListSchema.parse({
        ...bounty,
        groups: bounty.groups.map(({ groupId }) => ({ id: groupId })),
        submissionsCount: bounty._count.submissions,
      }),
    );

    return NextResponse.json(data);
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
  async ({ workspace, req, session }) => {
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

    const partnerGroups = await throwIfInvalidGroupIds({
      programId,
      groupIds,
    });

    const bountyName =
      name ??
      generateBountyName({
        rewardAmount,
        condition: performanceCondition,
      });

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
      return await tx.bounty.create({
        data: {
          id: bountyId,
          programId,
          workflowId: workflow?.id,
          name: bountyName,
          description,
          type,
          startsAt: startsAt!, // Can remove the ! when we're on a newer TS version (currently 5.4.4)
          endsAt,
          rewardAmount,
          ...(submissionRequirements &&
            type === "submission" && {
              submissionRequirements,
            }),
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

    const createdBounty = BountySchema.parse({
      ...bounty,
      groups: bounty.groups.map(({ groupId }) => ({ id: groupId })),
      performanceCondition: bounty.workflow?.triggerConditions?.[0],
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "bounty.created",
          description: `Bounty ${bounty.id} created`,
          actor: session?.user,
          targets: [
            {
              type: "bounty",
              id: bounty.id,
              metadata: createdBounty,
            },
          ],
        }),

        sendWorkspaceWebhook({
          workspace,
          trigger: "bounty.created",
          data: createdBounty,
        }),

        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/notify-partners`,
          body: {
            bountyId: bounty.id,
          },
          notBefore: Math.floor(bounty.startsAt.getTime() / 1000),
        }),
      ]),
    );

    return NextResponse.json(createdBounty);
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

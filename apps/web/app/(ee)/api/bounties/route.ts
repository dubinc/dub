import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { generatePerformanceBountyName } from "@/lib/api/bounties/generate-performance-bounty-name";
import { validateBounty } from "@/lib/api/bounties/validate-bounty";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { WorkflowAction } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  BountyListSchema,
  BountySchema,
  createBountySchema,
  getBountiesQuerySchema,
} from "@/lib/zod/schemas/bounties";
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ATTRIBUTE_TRIGGER,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/bounties - get all bounties for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, includeSubmissionsCount } =
      getBountiesQuerySchema.parse(searchParams);

    const programEnrollment = partnerId
      ? await getProgramEnrollmentOrThrow({
          partnerId,
          programId,
          include: {
            program: true,
          },
        })
      : null;

    const [bounties, allBountiesSubmissionsCount] = await Promise.all([
      prisma.bounty.findMany({
        where: {
          programId,
          // Filter only bounties the specified partner is eligible for
          ...(programEnrollment && {
            OR: [
              {
                groups: {
                  none: {},
                },
              },
              {
                groups: {
                  some: {
                    groupId:
                      programEnrollment.groupId ||
                      programEnrollment.program.defaultGroupId,
                  },
                },
              },
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
      }),
      includeSubmissionsCount
        ? prisma.bountySubmission.groupBy({
            by: ["bountyId", "status"],
            where: {
              programId,
              status: {
                in: ["submitted", "approved"],
              },
            },
            _count: {
              status: true,
            },
          })
        : null,
    ]);

    const aggregateSubmissionsCountForBounty = (bountyId: string) => {
      if (!allBountiesSubmissionsCount) {
        return null;
      }
      const bountySubmissions = allBountiesSubmissionsCount.filter(
        (s) => s.bountyId === bountyId,
      );
      const total = bountySubmissions.reduce(
        (sum, s) => sum + s._count.status,
        0,
      );
      const submitted =
        bountySubmissions.find((s) => s.status === "submitted")?._count
          .status ?? 0;
      const approved =
        bountySubmissions.find((s) => s.status === "approved")?._count.status ??
        0;
      return {
        total,
        submitted,
        approved,
      };
    };

    const data = bounties.map((bounty) => {
      return BountyListSchema.parse({
        ...bounty,
        groups: bounty.groups.map(({ groupId }) => ({ id: groupId })),
        ...(allBountiesSubmissionsCount && {
          submissionsCountData: aggregateSubmissionsCountForBounty(bounty.id),
        }),
      });
    });

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

    let {
      name,
      description,
      type,
      rewardAmount,
      rewardDescription,
      startsAt,
      endsAt,
      submissionsOpenAt,
      submissionRequirements,
      groupIds,
      performanceCondition,
      performanceScope,
      sendNotificationEmails,
    } = createBountySchema.parse(await parseRequestBody(req));

    // Use current date as default if startsAt is not provided
    startsAt = startsAt || new Date();

    validateBounty({
      type,
      startsAt,
      endsAt,
      submissionsOpenAt,
      rewardAmount,
      rewardDescription,
      performanceScope,
    });

    const partnerGroups = await throwIfInvalidGroupIds({
      programId,
      groupIds,
    });

    // Bounty name
    let bountyName = name;

    if (type === "performance" && performanceCondition) {
      bountyName = generatePerformanceBountyName({
        rewardAmount: rewardAmount ?? 0, // this shouldn't happen since we return early if rewardAmount is null
        condition: performanceCondition,
      });
    }

    if (!bountyName) {
      throw new DubApiError({
        code: "bad_request",
        message: "Bounty name is required.",
      });
    }

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
            trigger: WORKFLOW_ATTRIBUTE_TRIGGER[performanceCondition.attribute],
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
          submissionsOpenAt: type === "submission" ? submissionsOpenAt : null,
          rewardAmount,
          rewardDescription,
          performanceScope: type === "performance" ? performanceScope : null,
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

    const shouldScheduleDraftSubmissions =
      bounty.type === "performance" && bounty.performanceScope === "lifetime";

    const { canSendEmailCampaigns } = getPlanCapabilities(workspace.plan);

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

        sendNotificationEmails &&
          canSendEmailCampaigns &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/notify-partners`,
            body: {
              bountyId: bounty.id,
            },
            notBefore: Math.floor(bounty.startsAt.getTime() / 1000),
          }),

        shouldScheduleDraftSubmissions &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/create-draft-submissions`,
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

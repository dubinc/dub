import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getBountyWithDetails } from "@/lib/api/bounties/get-bounty-with-details";
import { DubApiError } from "@/lib/api/errors";
import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  BountySchema,
  BountySchemaExtended,
  updateBountySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, arrayEqual } from "@dub/utils";
import { PartnerGroup, Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/bounties/[bountyId] - get a bounty
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { bountyId } = params;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const bounty = await getBountyWithDetails({
      bountyId,
      programId,
    });

    return NextResponse.json(BountySchemaExtended.parse(bounty));
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

// PATCH /api/bounties/[bountyId] - update a bounty
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { bountyId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      name,
      description,
      startsAt,
      endsAt,
      rewardAmount,
      submissionRequirements,
      performanceCondition,
      groupIds,
    } = updateBountySchema.parse(await parseRequestBody(req));

    if (startsAt && endsAt && endsAt < startsAt) {
      throw new DubApiError({
        message: "endsAt must be on or after startsAt.",
        code: "bad_request",
      });
    }
    const bounty = await prisma.bounty.findUniqueOrThrow({
      where: {
        id: bountyId,
        programId,
      },
      include: {
        groups: true,
      },
    });

    // TODO:
    // When we do archive, make sure it disables the workflow

    // if groupIds is provided and is different from the current groupIds, update the groups
    let updatedPartnerGroups: PartnerGroup[] | undefined = undefined;
    if (
      groupIds &&
      !arrayEqual(
        bounty.groups.map((group) => group.groupId),
        groupIds,
      )
    ) {
      updatedPartnerGroups = await throwIfInvalidGroupIds({
        programId,
        groupIds,
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      const updatedBounty = await tx.bounty.update({
        where: {
          id: bounty.id,
        },
        data: {
          name: name ?? undefined,
          description,
          startsAt: startsAt!, // Can remove the ! when we're on a newer TS version (currently 5.4.4)
          endsAt,
          rewardAmount,
          ...(bounty.type === "submission" &&
            submissionRequirements !== undefined && {
              submissionRequirements: submissionRequirements ?? Prisma.DbNull,
            }),
          ...(updatedPartnerGroups && {
            groups: {
              deleteMany: {},
              create: updatedPartnerGroups.map((group) => ({
                groupId: group.id,
              })),
            },
          }),
        },
        include: {
          workflow: true,
          groups: true,
        },
      });

      if (updatedBounty.workflowId && performanceCondition) {
        await tx.workflow.update({
          where: {
            id: updatedBounty.workflowId,
          },
          data: {
            triggerConditions: [performanceCondition],
          },
        });
      }

      return {
        ...updatedBounty,
        performanceCondition,
      };
    });

    const updatedBounty = BountySchema.parse({
      ...data,
      groups: data.groups.map(({ groupId }) => ({ id: groupId })),
      performanceCondition: data.workflow?.triggerConditions?.[0],
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "bounty.updated",
          description: `Bounty ${bounty.id} updated`,
          actor: session?.user,
          targets: [
            {
              type: "bounty",
              id: bounty.id,
              metadata: updatedBounty,
            },
          ],
        }),
        sendWorkspaceWebhook({
          workspace,
          trigger: "bounty.updated",
          data: updatedBounty,
        }),

        // if bounty.startsAt was updated, publish a new message to the queue
        updatedBounty.startsAt.getTime() !== bounty.startsAt.getTime() &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/notify-partners`,
            body: {
              bountyId: updatedBounty.id,
            },
            notBefore: Math.floor(updatedBounty.startsAt.getTime() / 1000),
          }),
      ]),
    );

    return NextResponse.json(updatedBounty);
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

// DELETE /api/bounties/[bountyId] - delete a bounty
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { bountyId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const bounty = await prisma.bounty.findUniqueOrThrow({
      where: {
        id: bountyId,
        programId,
      },
      include: {
        groups: true,
        workflow: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (bounty._count.submissions > 0) {
      throw new DubApiError({
        message:
          "Bounties with submissions cannot be deleted. You can archive them instead.",
        code: "bad_request",
      });
    }

    await prisma.$transaction(async (tx) => {
      const bounty = await tx.bounty.delete({
        where: {
          id: bountyId,
        },
      });

      if (bounty.workflowId) {
        await tx.workflow.delete({
          where: {
            id: bounty.workflowId,
          },
        });
      }
    });

    const deletedBounty = BountySchema.parse({
      ...bounty,
      groups: bounty.groups.map(({ groupId }) => ({ id: groupId })),
      performanceCondition: bounty.workflow?.triggerConditions?.[0],
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "bounty.deleted",
        description: `Bounty ${bountyId} deleted`,
        actor: session?.user,
        targets: [
          {
            type: "bounty",
            id: bountyId,
            metadata: deletedBounty,
          },
        ],
      }),
    );

    return NextResponse.json({ id: bountyId });
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

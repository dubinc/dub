import { getBountyWithDetails } from "@/lib/api/bounties/get-bounty-with-details";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  BountySchema,
  BountySchemaExtended,
  updateBountySchema,
} from "@/lib/zod/schemas/bounties";
import { booleanQuerySchema } from "@/lib/zod/schemas/misc";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  includeExpandedFields: booleanQuerySchema.optional().default("false"),
});

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
  async ({ workspace, params, req }) => {
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
    });

    // TODO:
    // When we do archive, make sure it disables the workflow

    const groups = groupIds?.length
      ? await prisma.partnerGroup.findMany({
          where: {
            programId,
            id: {
              in: groupIds,
            },
          },
        })
      : [];

    const updatedBounty = await prisma.$transaction(async (tx) => {
      const updatedBounty = await tx.bounty.update({
        where: {
          id: bounty.id,
        },
        data: {
          name,
          description,
          startsAt: startsAt!, // Can remove the ! when we're on a newer TS version (currently 5.4.4)
          endsAt,
          rewardAmount,
          ...(bounty.type === "submission" &&
            submissionRequirements !== undefined && {
              submissionRequirements: submissionRequirements ?? Prisma.JsonNull,
            }),
          groups: {
            deleteMany: {},
            create: groups.map((group) => ({
              groupId: group.id,
            })),
          },
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

    waitUntil(
      sendWorkspaceWebhook({
        workspace,
        trigger: "bounty.updated",
        data: BountySchema.parse(updatedBounty),
      }),
    );

    return NextResponse.json(BountySchema.parse(updatedBounty));
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
  async ({ workspace, params }) => {
    const { bountyId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const bounty = await prisma.bounty.findUniqueOrThrow({
      where: {
        id: bountyId,
        programId,
      },
      include: {
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

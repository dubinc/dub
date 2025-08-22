import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  BountySchema,
  BountySchemaExtended,
  updateBountySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/bounties/[bountyId] - get a bounty
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { bountyId } = params;
  const programId = getDefaultProgramIdOrThrow(workspace);

  const bounty = await getBountyOrThrow({
    bountyId,
    programId,
  });

  return NextResponse.json(BountySchemaExtended.parse(bounty));
});

// PATCH /api/bounties/[bountyId] - update a bounty
export const PATCH = withWorkspace(async ({ workspace, params, req }) => {
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

  const bounty = await getBountyOrThrow({
    bountyId,
    programId,
  });

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
        startsAt,
        endsAt,
        rewardAmount,
        ...(bounty.type === "submission" && {
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

  return NextResponse.json(BountySchema.parse(updatedBounty));
});

// DELETE /api/bounties/[bountyId] - delete a bounty
export const DELETE = withWorkspace(async ({ workspace, params }) => {
  const { bountyId } = params;
  const programId = getDefaultProgramIdOrThrow(workspace);

  await getBountyOrThrow({
    bountyId,
    programId,
  });

  // TODO:
  // What happens to the created commissions?

  await prisma.$transaction(async (tx) => {
    const bounty = await tx.bounty.delete({
      where: {
        id: bountyId,
      },
    });

    await tx.bountySubmission.deleteMany({
      where: {
        bountyId,
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
});

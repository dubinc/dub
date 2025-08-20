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

  // TODO: [bounties] Persist performance logic to workflow and groupIds to bountyGroup
  const { performanceCondition, groupIds, ...data } = updateBountySchema.parse(
    await parseRequestBody(req),
  );

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

  await prisma.bounty.update({
    where: {
      id: bounty.id,
    },
    data: {
      ...data,
      submissionRequirements: data.submissionRequirements ?? Prisma.JsonNull,
      startsAt: new Date(data.startsAt!),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,

      groups: {
        deleteMany: {},
        create: groups?.map((group) => ({
          groupId: group.id,
        })),
      },
    },
  });

  return NextResponse.json(BountySchema.parse(bounty));
});

// DELETE /api/bounties/[bountyId] - delete a bounty
export const DELETE = withWorkspace(async ({ workspace, params }) => {
  const { bountyId } = params;
  const programId = getDefaultProgramIdOrThrow(workspace);

  await getBountyOrThrow({
    bountyId,
    programId,
  });

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

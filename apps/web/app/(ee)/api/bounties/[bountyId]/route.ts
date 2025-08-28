import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
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
  async ({ workspace, params, searchParams }) => {
    const { bountyId } = params;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const { includeExpandedFields } = schema.parse(searchParams);

    const bounty = await getBountyOrThrow({
      bountyId,
      programId,
      includeExpandedFields,
    });

    return NextResponse.json(BountySchemaExtended.parse(bounty));
  },
);

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

  if (endsAt && endsAt < startsAt) {
    throw new DubApiError({
      message: "endsAt must be on or after startsAt.",
      code: "bad_request",
    });
  }
  const bounty = await getBountyOrThrow({
    bountyId,
    programId,
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

  waitUntil(
    sendWorkspaceWebhook({
      workspace,
      trigger: "bounty.updated",
      data: BountySchema.parse(updatedBounty),
    }),
  );

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

  // TODO:
  // We should also delete the files submitted for the bounty from R2.

  return NextResponse.json({ id: bountyId });
});

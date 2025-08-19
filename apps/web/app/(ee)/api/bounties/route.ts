import { getBounties } from "@/lib/api/bounties/get-bounties";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { createWorkflow } from "@/lib/api/workflows/create-workflow";
import { withWorkspace } from "@/lib/auth";
import {
  BountySchema,
  BountySchemaExtended,
  createBountySchema,
  getBountiesQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/bounties - get all bounties for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const parsedInput = getBountiesQuerySchema.parse(searchParams);

  const bounties = await getBounties({
    ...parsedInput,
    programId,
  });

  return NextResponse.json(z.array(BountySchemaExtended).parse(bounties));
});

// POST /api/bounties - create a bounty
export const POST = withWorkspace(async ({ workspace, req }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  // TODO: [bounties] Persist performance logic to workflow and groupIds to bountyGroup
  const {
    name,
    description,
    type,
    rewardAmount,
    startsAt,
    endsAt,
    submissionRequirements,
  } = createBountySchema.parse(await parseRequestBody(req));

  const workflow = await createWorkflow({
    program: {
      id: programId,
    },
    workflow: {
      trigger: "clicks",
      triggerConditions: {},
      actions: {},
    },
  });

  const bounty = await prisma.bounty.create({
    data: {
      id: createId({ prefix: "bounty_" }),
      programId,
      workflowId: workflow.id,
      name,
      description,
      type,
      startsAt: startsAt!, // Can remove the ! when we're on a newer TS version (currently 5.4.4)
      endsAt,
      rewardAmount,
      submissionRequirements: submissionRequirements ?? Prisma.JsonNull,
    },
  });

  return NextResponse.json(BountySchema.parse(bounty));
});

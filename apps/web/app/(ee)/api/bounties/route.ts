import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { createWorkflow } from "@/lib/api/workflows/create-workflow";
import { withWorkspace } from "@/lib/auth";
import { BountySchema, createBountySchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/bounties - get all bounties for a program
export const GET = withWorkspace(async ({ workspace }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(z.array(BountySchema).parse(bounties));
});

// POST /api/bounties - create a bounty
export const POST = withWorkspace(async ({ workspace, req }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { name, description, type, rewardAmount, startsAt, endsAt } =
    createBountySchema.parse(await parseRequestBody(req));

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
    },
  });

  return NextResponse.json(BountySchema.parse(bounty));
});

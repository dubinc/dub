import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { BountySchema, BountySchemaExtended } from "@/lib/zod/schemas/bounties";
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
export const PATCH = withWorkspace(async ({ workspace, params }) => {
  const { bountyId } = params;
  const programId = getDefaultProgramIdOrThrow(workspace);

  const bounty = await getBountyOrThrow({
    bountyId,
    programId,
  });

  return NextResponse.json(BountySchema.parse(bounty));
});

// DELETE /api/bounties/[bountyId] - delete a bounty
export const DELETE = withWorkspace(async ({ workspace, params }) => {
  const { bountyId } = params;
  const programId = getDefaultProgramIdOrThrow(workspace);

  const bounty = await getBountyOrThrow({
    bountyId,
    programId,
  });

  return NextResponse.json({ id: bounty.id });
});

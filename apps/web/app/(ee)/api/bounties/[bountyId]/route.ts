import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// PATCH /api/bounties/[bountyId] - update a bounty
export const PATCH = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  return NextResponse.json({});
});

// DELETE /api/bounties/[bountyId] - delete a bounty
export const DELETE = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  return NextResponse.json({});
});

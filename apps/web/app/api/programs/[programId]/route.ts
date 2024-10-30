import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/programs/[programId] - get a program by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId: params.programId,
  });

  return NextResponse.json(program);
});

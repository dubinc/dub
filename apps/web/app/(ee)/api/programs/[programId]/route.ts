import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { ProgramSchemaWithInviteEmailData } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/programs/[programId] - get a program by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId: params.programId,
    include: {
      categories: true,
    },
  });

  return NextResponse.json(ProgramSchemaWithInviteEmailData.parse(program));
});

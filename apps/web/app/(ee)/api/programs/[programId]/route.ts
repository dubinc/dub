import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getProgramQuerySchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/programs/[programId] - get a program by id
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { includeLanderData } = getProgramQuerySchema.parse(searchParams);

    const program = await getProgramOrThrow(
      {
        workspaceId: workspace.id,
        programId: params.programId,
      },
      {
        includeDefaultDiscount: true,
        includeDefaultRewards: true,
        includeLanderData: includeLanderData || false,
      },
    );

    return NextResponse.json(program);
  },
);

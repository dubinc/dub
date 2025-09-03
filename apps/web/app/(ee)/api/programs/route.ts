import { withWorkspace } from "@/lib/auth";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs - get all programs for a workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const programs = await prisma.program.findMany({
    where: {
      workspaceId: workspace.id,
    },
  });

  return NextResponse.json(z.array(ProgramSchema).parse(programs));
});

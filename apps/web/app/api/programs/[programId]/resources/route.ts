import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/resources - get resources for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  if (programId !== workspace.defaultProgramId) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId: workspace.id,
    },
    select: {
      resources: true,
    },
  });

  const resources = programResourcesSchema.parse(
    program?.resources ?? {
      logos: [],
      colors: [],
      files: [],
    },
  );

  return NextResponse.json(resources);
});

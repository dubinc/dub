import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/resources - get resources for a program
export const GET = withWorkspace(async ({ workspace }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

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

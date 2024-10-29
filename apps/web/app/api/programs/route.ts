import { DubApiError } from "@/lib/api/errors";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProgramSchema, programSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs - get all programs for the given workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const programs = await prisma.program.findMany({
    where: {
      workspaceId: workspace.id,
    },
  });

  return NextResponse.json(z.array(programSchema).parse(programs));
});

// POST /api/programs/ - create a new programs
export const POST = withWorkspace(async ({ req, workspace }) => {
  const { name, slug } = createProgramSchema.parse(await parseRequestBody(req));

  const existingProgram = await prisma.program.findFirst({
    where: {
      slug,
    },
  });

  if (existingProgram) {
    throw new DubApiError({
      code: "conflict",
      message: "A program with this slug already exists.",
    });
  }

  const program = await prisma.program.create({
    data: {
      id: createId("pg"),
      workspaceId: workspace.id,
      name,
      slug,
    },
  });

  return NextResponse.json(programSchema.parse(program), { status: 201 });
});

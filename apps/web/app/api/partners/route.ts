import { withSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/programs - get all partner programs for a given partnerId or workspaceId
export const GET = withSession(async ({ searchParams, session }) => {
  const { partnerId } = searchParams;

  const programs = await prisma.program.findMany({
    where: {
      partners: {
        some: {
          id: partnerId,
        },
      },
    },
  });
  return NextResponse.json(
    programs.map((program) => ProgramSchema.parse(program)),
  );
});

import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

const responseSchema = z.object({
  status: z.nativeEnum(ProgramEnrollmentStatus),
  _count: z.number(),
});

// GET /api/programs/[programId]/partners/count
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const programEnrollments = await prisma.programEnrollment.groupBy({
    by: ["status"],
    where: {
      programId,
    },
    _count: true,
  });

  const counts = programEnrollments.reduce(
    (acc, p) => {
      acc[p.status] = p._count;
      return acc;
    },
    {} as Record<ProgramEnrollmentStatus | "all", number>,
  );

  counts.all = programEnrollments.reduce((acc, p) => acc + p._count, 0);

  return NextResponse.json(counts);
});

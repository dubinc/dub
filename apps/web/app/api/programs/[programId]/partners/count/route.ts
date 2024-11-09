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

  const counts = Object.values(ProgramEnrollmentStatus).map((status) => ({
    status,
    _count: programEnrollments.find((p) => p.status === status)?._count || 0,
  }));

  return NextResponse.json([
    ...z.array(responseSchema).parse(counts),
    {
      status: "all",
      _count: programEnrollments.reduce((acc, p) => acc + p._count, 0),
    },
  ]);
});

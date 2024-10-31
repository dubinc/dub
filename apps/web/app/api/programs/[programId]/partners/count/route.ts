import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

export const responseSchema = z.object({
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

  const allStatuses = Object.values(ProgramEnrollmentStatus).map((status) => ({
    status,
    _count: 0,
  }));

  // Fill the missing statuses with 0
  const counts = allStatuses.map(
    (statusCount) =>
      programEnrollments.find((p) => p.status === statusCount.status) ||
      statusCount,
  );

  return NextResponse.json(z.array(responseSchema).parse(counts));
});

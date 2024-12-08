import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma, ProgramEnrollmentStatus } from "@dub/prisma";
import { NextResponse } from "next/server";

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

  // fill in missing statuses with 0
  Object.values(ProgramEnrollmentStatus).forEach((status) => {
    if (!(status in counts)) {
      counts[status] = 0;
    }
  });

  counts.all = programEnrollments.reduce((acc, p) => acc + p._count, 0);

  return NextResponse.json(counts);
});

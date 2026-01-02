import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerCrossProgramSummarySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/cross-program-summary - get cross-program summary for a partner
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {},
    });

    const programEnrollments = await prisma.programEnrollment.groupBy({
      by: ["status"],
      where: {
        partnerId,
        programId: {
          not: programId,
        },
        status: {
          not: "pending",
        },
      },
      _count: true,
    });

    const totalPrograms = programEnrollments.reduce(
      (acc, enrollment) => acc + enrollment._count,
      0,
    );

    // approved and archived statuses
    const trustedPrograms = programEnrollments
      .filter((enrollment) =>
        ["approved", "archived"].includes(enrollment.status),
      )
      .reduce((acc, enrollment) => acc + enrollment._count, 0);

    // all other statuses
    const removedPrograms = totalPrograms - trustedPrograms;

    return NextResponse.json(
      partnerCrossProgramSummarySchema.parse({
        totalPrograms,
        trustedPrograms,
        removedPrograms,
      }),
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

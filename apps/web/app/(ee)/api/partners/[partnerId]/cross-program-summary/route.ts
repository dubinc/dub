import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  INACTIVE_ENROLLMENT_STATUSES,
  partnerCrossProgramSummarySchema,
} from "@/lib/zod/schemas/partners";
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
          notIn: [...INACTIVE_ENROLLMENT_STATUSES, "pending"],
        },
      },
      _count: true,
    });

    const totalPrograms = programEnrollments.reduce(
      (acc, enrollment) => acc + enrollment._count,
      0,
    );

    const bannedPrograms =
      programEnrollments.find((enrollment) => enrollment.status === "banned")
        ?._count ?? 0;

    const trustedPrograms = totalPrograms - bannedPrograms;

    return NextResponse.json(
      partnerCrossProgramSummarySchema.parse({
        totalPrograms,
        bannedPrograms,
        trustedPrograms,
      }),
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

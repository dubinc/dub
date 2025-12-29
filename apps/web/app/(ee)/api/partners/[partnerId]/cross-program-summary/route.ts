import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  crossProgramSummarySchema,
  INACTIVE_ENROLLMENT_STATUSES,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/cross-program-summary - get cross-program summary for a partner
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        id: true,
      },
    });

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId,
        status: {
          notIn: ["pending"],
        },
      },
      select: {
        status: true,
      },
    });

    const bannedPrograms = programEnrollments.filter(
      (enrollment) => enrollment.status === "banned",
    ).length;

    const trustedPrograms = programEnrollments.filter(
      (enrollment) => !INACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status),
    ).length;

    return NextResponse.json(
      crossProgramSummarySchema.parse({
        totalPrograms: programEnrollments.length,
        bannedPrograms,
        trustedPrograms,
      }),
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

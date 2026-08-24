import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_ENROLLMENT_STATUSES,
  partnerNetworkActivitySummarySchema,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/network-activity - get network activity summary for a partner
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
      },
      _count: true,
    });

    // approved and archived statuses
    const activePrograms = programEnrollments
      .filter((enrollment) =>
        ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status),
      )
      .reduce((acc, enrollment) => acc + enrollment._count, 0);

    // banned statuses
    const bannedPrograms =
      programEnrollments.find((enrollment) => enrollment.status === "banned")
        ?._count ?? 0;

    return NextResponse.json(
      partnerNetworkActivitySummarySchema.parse({
        totalPrograms: activePrograms + bannedPrograms,
        activePrograms,
        bannedPrograms,
      }),
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

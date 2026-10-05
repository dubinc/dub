import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
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

    const programApplication = await prisma.programApplication.findFirst({
      where: {
        programId,
        partnerId,
      },
      select: {
        id: true,
      },
    });

    // Prevent fetching the network activity summary if the partner has not applied to the program
    if (!programApplication) {
      throw new DubApiError({
        code: "not_found",
        message: `Partner ${partnerId} has not applied to program.`,
      });
    }

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

import { reportNetworkLevelBan } from "@/lib/api/fraud/report-network-level-ban";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminFlagFraudSchema } from "@/lib/zod/schemas/admin";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/admin/partners/[partnerId]/flag-fraud
export const POST = withAdmin(
  async ({ params, req, session }) => {
    const { partnerId } = params;
    const { reason, reviewNote } = adminFlagFraudSchema.parse(await req.json());

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        fraudAlerts: {
          where: {
            source: "admin",
            status: "confirmed",
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.fraudAlerts.length > 0) {
      return new Response("Partner has already been flagged for fraud.", {
        status: 409,
      });
    }

    const activeEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId,
        status: {
          notIn: INACTIVE_ENROLLMENT_STATUSES,
        },
      },
      select: {
        programId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (activeEnrollments.length === 0) {
      return new Response("Partner has no active program enrollments.", {
        status: 400,
      });
    }

    const networkEnrollment = activeEnrollments.find(
      (enrollment) => enrollment.programId === NETWORK_PROGRAM_ID,
    );
    const anchorProgramId =
      networkEnrollment?.programId ?? activeEnrollments[0].programId;

    // Alert the programs first, so that a retry after a failure is not blocked by the 409 above
    let alertedProgramsCount: number;
    try {
      alertedProgramsCount = await reportNetworkLevelBan({
        partnerId,
        programId: NETWORK_PROGRAM_ID,
        bannedReason: "fraud",
        bannedAt: new Date(),
      });
    } catch {
      return new Response(
        "Alerting enrolled programs failed. Please try again.",
        { status: 500 },
      );
    }

    await prisma.fraudAlert.create({
      data: {
        partnerId,
        programId: anchorProgramId,
        reason,
        source: "admin",
        status: "confirmed",
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
        reviewedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      alertedProgramsCount,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);

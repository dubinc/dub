import { confirmPartnerFraudAlerts } from "@/lib/api/fraud/confirm-partner-fraud-alerts";
import { reportAdminFraudToPrograms } from "@/lib/api/fraud/report-admin-fraud-to-programs";
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
      select: { id: true },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
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

    const pendingAdminAlert = await prisma.fraudAlert.findFirst({
      where: {
        partnerId,
        source: "admin",
        status: "pending",
      },
      select: { id: true },
    });

    if (!pendingAdminAlert) {
      await prisma.fraudAlert.create({
        data: {
          partnerId,
          programId: anchorProgramId,
          reason,
          source: "admin",
        },
      });
    }

    const { confirmedCount } = await confirmPartnerFraudAlerts({
      partnerId,
      reviewedById: session.user.id,
      reviewNote,
      skipCrossProgramReporting: true,
      source: "admin",
    });

    if (confirmedCount === 0) {
      return new Response("Failed to confirm fraud alert.", { status: 500 });
    }

    try {
      const alertedProgramsCount = await reportAdminFraudToPrograms({
        partnerId,
      });

      return NextResponse.json({
        success: true,
        alertedProgramsCount,
      });
    } catch {
      return new Response(
        "Fraud alert was confirmed but alerting enrolled programs failed. Please try again.",
        { status: 500 },
      );
    }
  },
  {
    requiredRoles: ["owner"],
  },
);

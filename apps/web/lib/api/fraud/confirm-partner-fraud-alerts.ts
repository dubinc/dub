import { reportCrossProgramBanToNetwork } from "@/lib/api/fraud/report-cross-program-ban-to-network";
import { prisma } from "@/lib/prisma";
import { FraudAlertSource, Prisma } from "@prisma/client";

export async function confirmPartnerFraudAlerts({
  partnerId,
  reviewedById,
  reviewNote,
  skipCrossProgramReporting = false,
  source,
}: {
  partnerId: string;
  reviewedById: string;
  reviewNote?: string;
  skipCrossProgramReporting?: boolean;
  source?: FraudAlertSource;
}) {
  const reviewedAt = new Date();
  const reviewData: Prisma.FraudAlertUpdateManyArgs["data"] = {
    reviewedAt,
    reviewNote: reviewNote || null,
    reviewedById,
  };

  const pendingFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      partnerId,
      status: "pending",
      ...(source ? { source } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      programEnrollment: {
        select: {
          programId: true,
          partnerId: true,
          bannedReason: true,
          bannedAt: true,
          application: {
            select: {
              reviewedAt: true,
            },
          },
        },
      },
    },
  });

  if (pendingFraudAlerts.length === 0) {
    return { confirmedCount: 0, alertedProgramsCount: 0 };
  }

  const { count: confirmedCount } = await prisma.fraudAlert.updateMany({
    where: {
      id: {
        in: pendingFraudAlerts.map((fa) => fa.id),
      },
      status: "pending",
    },
    data: {
      status: "confirmed",
      ...reviewData,
    },
  });

  if (confirmedCount === 0) {
    return { confirmedCount: 0, alertedProgramsCount: 0 };
  }

  if (skipCrossProgramReporting) {
    return {
      confirmedCount,
      alertedProgramsCount: 0,
    };
  }

  const confirmedFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      id: { in: pendingFraudAlerts.map((fa) => fa.id) },
      status: "confirmed",
      reviewedById,
      reviewedAt,
    },
    select: {
      id: true,
      createdAt: true,
      programEnrollment: {
        select: {
          programId: true,
          partnerId: true,
          bannedReason: true,
          bannedAt: true,
          application: {
            select: {
              reviewedAt: true,
            },
          },
        },
      },
    },
  });

  const alertResults = await Promise.allSettled(
    confirmedFraudAlerts.map(({ programEnrollment, createdAt }) =>
      reportCrossProgramBanToNetwork({
        partnerId: programEnrollment.partnerId,
        programId: programEnrollment.programId,
        bannedReason: programEnrollment.bannedReason ?? "fraud",
        bannedAt:
          programEnrollment.bannedAt ??
          programEnrollment.application?.reviewedAt ??
          createdAt,
      }),
    ),
  );

  const failedReports = alertResults.filter(
    (result) => result.status === "rejected",
  );
  if (failedReports.length > 0) {
    console.error(
      "[confirmPartnerFraudAlerts] Failed to report cross-program bans",
      failedReports,
    );
  }

  return {
    confirmedCount,
    alertedProgramsCount: alertResults.reduce(
      (sum, result) => sum + (result.status === "fulfilled" ? result.value : 0),
      0,
    ),
  };
}

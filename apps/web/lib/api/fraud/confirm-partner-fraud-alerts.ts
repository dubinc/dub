import { reportNetworkLevelBan } from "@/lib/api/fraud/report-network-level-ban";
import { prisma } from "@/lib/prisma";
import { FraudAlertSource } from "@prisma/client";

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

  const pendingFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      partnerId,
      status: "pending",
      ...(source ? { source } : {}),
    },
    select: {
      id: true,
    },
  });

  if (pendingFraudAlerts.length === 0) {
    return { confirmedCount: 0 };
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
      reviewedAt,
      reviewNote: reviewNote || null,
      reviewedById,
    },
  });

  if (confirmedCount === 0 || skipCrossProgramReporting) {
    return { confirmedCount };
  }

  const confirmedFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      id: { in: pendingFraudAlerts.map((fa) => fa.id) },
      status: "confirmed",
      reviewedById,
      reviewedAt,
    },
    select: {
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
      reportNetworkLevelBan({
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
      "[confirmPartnerFraudAlerts] Failed to report network-level bans",
      failedReports,
    );
  }

  return { confirmedCount };
}

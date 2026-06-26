import { reportCrossProgramBanToNetwork } from "@/lib/api/fraud/report-cross-program-ban-to-network";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function confirmPartnerFraudAlerts({
  partnerId,
  reviewedById,
  reviewNote,
  skipCrossProgramReporting = false,
}: {
  partnerId: string;
  reviewedById: string;
  reviewNote?: string;
  skipCrossProgramReporting?: boolean;
}) {
  const reviewData: Prisma.FraudAlertUpdateManyArgs["data"] = {
    reviewedAt: new Date(),
    reviewNote: reviewNote || null,
    reviewedById,
  };

  const pendingFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      partnerId,
      status: "pending",
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

  await prisma.fraudAlert.updateMany({
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

  if (skipCrossProgramReporting) {
    return {
      confirmedCount: pendingFraudAlerts.length,
      alertedProgramsCount: 0,
    };
  }

  const alertCounts = await Promise.all(
    pendingFraudAlerts.map(({ programEnrollment, createdAt }) =>
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

  return {
    confirmedCount: pendingFraudAlerts.length,
    alertedProgramsCount: alertCounts.reduce((sum, count) => sum + count, 0),
  };
}

import {
  getNetworkBanDetails,
  reportNetworkLevelBan,
} from "@/lib/api/fraud/report-network-level-ban";
import { prisma } from "@/lib/prisma";

export async function confirmPartnerFraudAlerts({
  partnerId,
  reviewedById,
  reviewNote,
}: {
  partnerId: string;
  reviewedById: string;
  reviewNote?: string;
}) {
  const reviewedAt = new Date();

  const pendingFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      partnerId,
      status: "pending",
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

  if (confirmedCount === 0) {
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
      programId: true,
      source: true,
      reviewedAt: true,
      createdAt: true,
      programEnrollment: {
        select: {
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
    confirmedFraudAlerts.map((fraudAlert) => {
      const { sourceProgramId, bannedReason, bannedAt } =
        getNetworkBanDetails(fraudAlert);

      return reportNetworkLevelBan({
        partnerId,
        programId: sourceProgramId,
        bannedReason,
        bannedAt,
      });
    }),
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

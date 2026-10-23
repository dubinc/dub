import { reportNetworkLevelBan } from "@/lib/api/fraud/report-network-level-ban";
import { banPartnerFromNetwork } from "@/lib/api/partners/network-ban";
import { prisma } from "@/lib/prisma";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { NETWORK_PROGRAM_ID } from "@dub/utils";

type FlagPartnerForFraudResult =
  | { status: "flagged"; alertedProgramsCount: number }
  | { status: "not_found" }
  | { status: "already_flagged" }
  | { status: "no_active_enrollments" }
  | { status: "alert_failed" };

/**
 * Confirms fraud for a partner as a Dub admin: alerts the enrolled programs
 * through the network-level ban risk rule, optionally bans the partner from
 * the network, and creates a confirmed admin fraud alert.
 */
export async function flagPartnerForFraud({
  partnerId,
  reason,
  reviewNote,
  reviewedById,
  banFromNetwork,
}: {
  partnerId: string;
  reason: string;
  reviewNote?: string;
  reviewedById: string;
  banFromNetwork?: boolean;
}): Promise<FlagPartnerForFraudResult> {
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
    return { status: "not_found" };
  }

  if (partner.fraudAlerts.length > 0) {
    return { status: "already_flagged" };
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
    return { status: "no_active_enrollments" };
  }

  const networkEnrollment = activeEnrollments.find(
    (enrollment) => enrollment.programId === NETWORK_PROGRAM_ID,
  );
  const anchorProgramId =
    networkEnrollment?.programId ?? activeEnrollments[0].programId;

  // Alert the programs first, so that a retry after a failure is not blocked by "already_flagged"
  let alertedProgramsCount: number;
  try {
    alertedProgramsCount = await reportNetworkLevelBan({
      partnerId,
      programId: NETWORK_PROGRAM_ID,
      bannedReason: "fraud",
      bannedAt: new Date(),
    });
  } catch {
    return { status: "alert_failed" };
  }

  // Ban before the alert is created, so that a failed ban can be retried
  if (banFromNetwork) {
    await banPartnerFromNetwork(partnerId);
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
      reviewedById,
    },
  });

  return { status: "flagged", alertedProgramsCount };
}

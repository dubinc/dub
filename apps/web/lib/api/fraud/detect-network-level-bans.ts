import { prisma } from "@/lib/prisma";
import { CreateFraudEventInput } from "@/lib/types";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { FraudRuleType, ProgramEnrollmentStatus } from "@prisma/client";
import { createFraudEvents } from "./create-fraud-events";
import { isFraudRuleEnabled } from "./get-merged-fraud-rules";
import { getNetworkBanDetails } from "./report-network-level-ban";

// Returns partnerCrossProgramBan fraud events for the partners that have a confirmed network-level
// ban. reportNetworkLevelBan only alerts programs the partner was enrolled in at ban time, so a
// program the partner joins later must be alerted when the enrollment is created.
export async function getNetworkLevelBanEvents({
  programId,
  partnerIds,
}: {
  programId: string;
  partnerIds: string[];
}) {
  const fraudEvents: CreateFraudEventInput[] = [];

  if (partnerIds.length === 0) {
    return fraudEvents;
  }

  const confirmedFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      status: "confirmed",
      // An unban removes the cross-program ban events from that program,
      // so skip program bans that were lifted
      OR: [
        { source: "admin" },
        {
          programEnrollment: {
            status: ProgramEnrollmentStatus.banned,
          },
        },
      ],
      // Only alert active enrollments with risk monitoring on, the same as reportNetworkLevelBan
      partner: {
        programs: {
          some: {
            programId,
            status: {
              notIn: INACTIVE_ENROLLMENT_STATUSES,
            },
            riskMonitoringDisabledAt: null,
          },
        },
      },
    },
    select: {
      partnerId: true,
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

  for (const fraudAlert of confirmedFraudAlerts) {
    const { sourceProgramId, bannedReason, bannedAt } =
      getNetworkBanDetails(fraudAlert);

    // Skip bans issued by this program. Admin bans come from the network program.
    if (sourceProgramId === programId) {
      continue;
    }

    fraudEvents.push({
      programId,
      partnerId: fraudAlert.partnerId,
      type: FraudRuleType.partnerCrossProgramBan,
      sourceProgramId,
      metadata: {
        bannedReason,
        bannedAt,
      },
    });
  }

  return fraudEvents;
}

// Detect and record network-level bans for partners that a program enrolled without an application
// (invites, the partners API, imports). Errors are logged, so they never block the enrollment.
export async function detectAndRecordNetworkLevelBans({
  programId,
  partnerIds,
}: {
  programId: string;
  partnerIds: string[];
}) {
  if (partnerIds.length === 0) {
    return;
  }

  try {
    const fraudRules = await prisma.fraudRule.findMany({
      where: {
        programId,
      },
    });

    if (
      !isFraudRuleEnabled({
        fraudRules,
        ruleType: FraudRuleType.partnerCrossProgramBan,
      })
    ) {
      return;
    }

    const fraudEvents = await getNetworkLevelBanEvents({
      programId,
      partnerIds,
    });

    await createFraudEvents(fraudEvents);
  } catch (error) {
    console.error(
      "Failed to detect network-level bans for program",
      programId,
      error,
    );
  }
}

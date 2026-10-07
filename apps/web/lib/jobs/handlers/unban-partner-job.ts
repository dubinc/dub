import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { recordLink } from "@/lib/tinybird";
import {
  BountySubmissionStatus,
  CommissionStatus,
  FraudAlertStatus,
  FraudRuleType,
  PayoutStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import * as z from "zod/v4";
import { trackCommissionStatusUpdate } from "../../api/commissions/track-commission-update-activity-log";
import { CRON_BATCH_SIZE } from "../../cron";
import { prisma } from "../../prisma";
import { defineJob } from "../index";

const inputSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
});

export const unbanPartnerJob = defineJob({
  name: "unban-partner-job",
  schema: inputSchema,
  async handle(input) {
    const { partnerId, programId, workspaceId } = input;

    const where = {
      partnerId,
      programId,
    };

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: where,
      },
      select: {
        status: true,
      },
    });

    if (!programEnrollment) {
      console.error(
        `[unbanPartnerJob] Program enrollment not found for partner ${partnerId} and program ${programId}. Skipping...`,
      );
      return;
    }

    if (programEnrollment.status !== ProgramEnrollmentStatus.approved) {
      console.error(
        `[unbanPartnerJob] Partner ${partnerId} is not approved in program ${programId} (status: ${programEnrollment.status}). Skipping...`,
      );
      return;
    }

    await restoreCanceledCommissions({
      workspaceId,
      programId,
      partnerId,
    });

    await syncTotalCommissions({
      partnerId,
      programId,
    });

    const [payouts, bountySubmissions] = await Promise.all([
      prisma.payout.updateMany({
        where: {
          ...where,
          status: PayoutStatus.canceled,
        },
        data: {
          status: PayoutStatus.pending,
        },
      }),

      prisma.bountySubmission.updateMany({
        where: {
          ...where,
          status: BountySubmissionStatus.rejected,
        },
        data: {
          status: BountySubmissionStatus.draft,
          rejectionNote: null,
          rejectionReason: null,
          reviewedAt: null,
        },
      }),
    ]);

    console.info(
      `Marked ${payouts.count} payouts and ${bountySubmissions.count} bounty submissions as submitted for partner ${partnerId} in program ${programId}.`,
    );

    const links = await prisma.link.findMany({
      where: where,
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    if (links.length > 0) {
      await Promise.allSettled([
        linkCache.expireMany(links),
        recordLink(links),
      ]);
    }

    // Clean up any pending network-level ban alerts that originated from this program.
    await prisma.$transaction([
      prisma.fraudEvent.deleteMany({
        where: {
          partnerId,
          sourceProgramId: programId,
          fraudEventGroup: {
            type: FraudRuleType.partnerCrossProgramBan,
          },
        },
      }),

      // Delete the fraud group if it has no more fraud events
      prisma.fraudEventGroup.deleteMany({
        where: {
          partnerId,
          type: FraudRuleType.partnerCrossProgramBan,
          fraudEvents: {
            none: {},
          },
        },
      }),

      // Delete any pending fraud alerts for this partner in this program
      prisma.fraudAlert.deleteMany({
        where: {
          partnerId,
          programId,
          status: FraudAlertStatus.pending,
        },
      }),
    ]);
  },
});

// Restore canceled commissions for a partner in a program
async function restoreCanceledCommissions({
  workspaceId,
  programId,
  partnerId,
}: {
  workspaceId: string;
  programId: string;
  partnerId: string;
}) {
  let restoredCommissions = 0;

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        partnerId,
        programId,
        status: CommissionStatus.canceled,
      },
      select: {
        id: true,
        amount: true,
        earnings: true,
        status: true,
        payoutId: true,
      },
      orderBy: {
        id: "asc",
      },
      take: CRON_BATCH_SIZE,
    });

    if (commissions.length === 0) {
      break;
    }

    const commissionsWithPayouts = commissions.filter(
      (commission) => commission.payoutId,
    );

    if (commissionsWithPayouts.length > 0) {
      const { count: restoredProcessedCommissions } =
        await prisma.commission.updateMany({
          where: {
            id: {
              in: commissionsWithPayouts.map(({ id }) => id),
            },
            status: CommissionStatus.canceled,
          },
          data: {
            status: CommissionStatus.processed,
          },
        });
      restoredCommissions += restoredProcessedCommissions;

      await trackCommissionStatusUpdate({
        workspaceId,
        programId,
        commissions: commissionsWithPayouts,
        newStatus: CommissionStatus.processed,
      });
    }

    const commissionsWithoutPayouts = commissions.filter(
      (commission) => !commission.payoutId,
    );
    if (commissionsWithoutPayouts.length > 0) {
      const { count: restoredPendingCommissions } =
        await prisma.commission.updateMany({
          where: {
            id: {
              in: commissionsWithoutPayouts.map(({ id }) => id),
            },
            status: CommissionStatus.canceled,
          },
          data: {
            status: CommissionStatus.pending,
          },
        });
      restoredCommissions += restoredPendingCommissions;

      await trackCommissionStatusUpdate({
        workspaceId,
        programId,
        commissions: commissionsWithoutPayouts,
        newStatus: CommissionStatus.pending,
      });
    }
  }

  console.info(
    `[unbanPartnerJob] Restored ${restoredCommissions} commissions for partner ${partnerId} in program ${programId}.`,
  );
}

// TODO
// Send email to partner about being unbanned

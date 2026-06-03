import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import { referralRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { CommissionStatus, Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { syncTotalCommissions } from "../partners/sync-total-commissions";
import { reconcilePayoutAmounts } from "./reconcile-payout-amounts";
import { trackCommissionStatusUpdate } from "./track-commission-update-activity-log";

const VOID_STATUSES: CommissionStatus[] = [
  "refunded",
  "duplicate",
  "fraud",
  "canceled",
];

export const voidReferralCommissionsSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  userId: z.string().optional(),
  sourceCommissionIds: z.array(z.string()).min(1),
  sourceCommissionStatus: z.enum(VOID_STATUSES),
});

type VoidReferralCommissionsArgs = z.infer<
  typeof voidReferralCommissionsSchema
>;

export async function voidReferralCommissions({
  workspaceId,
  programId,
  userId,
  sourceCommissionIds,
  sourceCommissionStatus,
}: VoidReferralCommissionsArgs) {
  if (sourceCommissionIds.length === 0) {
    console.log("No source commission IDs provided.");
    return;
  }

  const whereInput: Prisma.CommissionWhereInput = {
    sourceCommissionId: {
      in: sourceCommissionIds,
    },
    OR: [
      {
        status: "pending",
      },
      {
        status: "processed",
        payout: {
          status: {
            in: MUTABLE_PAYOUT_STATUSES,
          },
        },
      },
    ],
  };

  const { originalCommissions, voidedCommissions } = await prisma.$transaction(
    async (tx) => {
      const commissions = await tx.commission.findMany({
        where: whereInput,
        select: {
          id: true,
          partnerId: true,
          amount: true,
          earnings: true,
          status: true,
          payoutId: true,
        },
      });

      if (commissions.length === 0) {
        return {
          originalCommissions: commissions,
          voidedCommissions: [],
        };
      }

      const { count } = await tx.commission.updateMany({
        where: whereInput,
        data: {
          status: sourceCommissionStatus,
          payoutId: null,
        },
      });

      // No commissions were updated
      if (count === 0) {
        return {
          originalCommissions: commissions,
          voidedCommissions: [],
        };
      }

      const voidedCommissions = await tx.commission.findMany({
        where: {
          id: {
            in: commissions.map(({ id }) => id),
          },
          status: sourceCommissionStatus,
        },
        select: {
          id: true,
          partnerId: true,
          amount: true,
          earnings: true,
          status: true,
          payoutId: true,
        },
      });

      return {
        originalCommissions: commissions,
        voidedCommissions,
      };
    },
  );

  if (voidedCommissions.length === 0) {
    console.log("No referral commissions found.");
    return;
  }

  // Find unique partner Ids
  const partnerIds = [...new Set(voidedCommissions.map((c) => c.partnerId))];

  // Reconcile payout amounts for all affected payouts
  const affectedPayoutIds = [
    ...new Set(
      originalCommissions
        .filter(
          (commission) =>
            commission.status === "processed" && commission.payoutId,
        )
        .map((commission) => commission.payoutId!),
    ),
  ];

  await Promise.all([
    affectedPayoutIds.length > 0
      ? reconcilePayoutAmounts(affectedPayoutIds)
      : Promise.resolve(),

    ...partnerIds.map((partnerId) =>
      syncTotalCommissions({
        partnerId,
        programId,
      }),
    ),

    trackCommissionStatusUpdate({
      workspaceId,
      programId,
      userId,
      commissions: originalCommissions,
      newStatus: sourceCommissionStatus,
    }),
  ]);

  // For referral commissions created by the "commissionThreshold" trigger,
  // recalculate totalCommissionsEarned and void the referral commission if the
  // partner no longer meets the threshold.
  await cancelReferralCommissionsBelowThreshold({
    partnerIds,
    programId,
  });

  console.log(`Voided ${originalCommissions.length} referral commissions.`);
}

async function cancelReferralCommissionsBelowThreshold({
  partnerIds,
  programId,
}: {
  partnerIds: string[];
  programId: string;
}) {
  if (partnerIds.length === 0) {
    return;
  }

  const [totalCommissionsByPartner, programEnrollments] = await Promise.all([
    prisma.commission.groupBy({
      by: ["partnerId"],
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
        type: "sale",
        status: {
          in: ["pending", "processed", "paid"],
        },
      },
      _sum: {
        earnings: true,
      },
    }),

    prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      select: {
        partnerId: true,
        applicationEvent: {
          select: {
            referredByPartnerId: true,
          },
        },
      },
    }),
  ]);

  // Map of partnerId to total earnings
  const totalEarningsByPartnerId = new Map(
    totalCommissionsByPartner.map(({ partnerId, _sum }) => [
      partnerId,
      _sum.earnings ?? 0,
    ]),
  );

  // Map of partnerId to referredByPartnerId
  const referredByPartnerIdMap = new Map(
    programEnrollments
      .filter(({ applicationEvent }) => applicationEvent?.referredByPartnerId)
      .map(({ partnerId, applicationEvent }) => [
        partnerId,
        applicationEvent!.referredByPartnerId!,
      ]),
  );

  const referredByPartnerIds = [...new Set(referredByPartnerIdMap.values())];

  if (referredByPartnerIds.length === 0) {
    return;
  }

  const referrerEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: referredByPartnerIds,
      },
      programId,
    },
    select: {
      partnerId: true,
      referralReward: true,
    },
  });

  // Map of partnerId to referral reward
  const referralRewardByReferrerId = new Map(
    referrerEnrollments
      .filter(({ referralReward }) => referralReward)
      .map(({ partnerId, referralReward }) => [partnerId, referralReward!]),
  );

  const invoiceIdsToCancel: string[] = [];

  for (const partnerId of partnerIds) {
    const referredByPartnerId = referredByPartnerIdMap.get(partnerId);

    if (!referredByPartnerId) {
      continue;
    }

    const referralReward = referralRewardByReferrerId.get(referredByPartnerId);

    if (!referralReward) {
      continue;
    }

    const rewardConfig = referralRewardConfigSchema.safeParse(
      referralReward.config,
    );

    if (!rewardConfig.success) {
      continue;
    }

    const { trigger, commissionsThresholdInCents } = rewardConfig.data;

    if (trigger !== "commissionThreshold") {
      continue;
    }

    const totalCommissionsEarned = totalEarningsByPartnerId.get(partnerId) ?? 0;

    if (totalCommissionsEarned < (commissionsThresholdInCents ?? 0)) {
      invoiceIdsToCancel.push(`referral:${trigger}:${partnerId}`);
    }
  }

  if (invoiceIdsToCancel.length === 0) {
    return;
  }

  console.log(
    `Canceling ${invoiceIdsToCancel.length} commissions with invoice IDs.`,
    invoiceIdsToCancel,
  );

  await prisma.commission.updateMany({
    where: {
      invoiceId: {
        in: invoiceIdsToCancel,
      },
      programId,
      OR: [
        {
          status: "pending",
        },
        {
          status: "processed",
          payout: {
            status: {
              in: MUTABLE_PAYOUT_STATUSES,
            },
          },
        },
      ],
    },
    data: {
      status: "canceled",
    },
  });
}

export async function queueVoidReferralCommissions(
  args: VoidReferralCommissionsArgs,
) {
  if (args.sourceCommissionIds.length === 0) {
    return;
  }

  return qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/void`,
    body: args,
  });
}

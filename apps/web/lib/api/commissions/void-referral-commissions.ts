import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { syncTotalCommissions } from "../partners/sync-total-commissions";
import { reconcilePayoutAmounts } from "./reconcile-payout-amounts";
import { trackCommissionStatusUpdate } from "./track-commission-update-activity-log";

const VOID_STATUSES: CommissionStatus[] = [
  "refunded",
  "duplicate",
  "fraud",
  "canceled",
];

type VoidReferralCommissionsArgs = {
  workspaceId: string;
  programId: string;
  userId?: string;
  sourceCommissionIds: string[];
  sourceCommissionStatus: (typeof VOID_STATUSES)[number];
};

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

  const referralCommissions = await prisma.commission.findMany({
    where: {
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

  if (referralCommissions.length === 0) {
    console.log("No referral commissions found.");
    return;
  }

  const { count } = await prisma.commission.updateMany({
    where: {
      id: {
        in: referralCommissions.map((c) => c.id),
      },
    },
    data: {
      status: sourceCommissionStatus,
      payoutId: null,
    },
  });

  // Find unique partner Ids
  const partnerIds = [...new Set(referralCommissions.map((c) => c.partnerId))];

  // Reconcile payout amounts for all affected payouts
  const affectedPayoutIds = [
    ...referralCommissions
      .filter(
        (commission) =>
          commission.status === "processed" && commission.payoutId,
      )
      .map((commission) => commission.payoutId!),
  ];

  await Promise.allSettled([
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
      commissions: referralCommissions,
      newStatus: sourceCommissionStatus,
    }),
  ]);

  console.log(`Voided ${count} referral commissions.`);
}

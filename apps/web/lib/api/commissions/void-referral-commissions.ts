import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { prisma } from "@dub/prisma";
import { CommissionStatus, Prisma } from "@dub/prisma/client";
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

  const whereInput: Prisma.CommissionWhereInput = {
    sourceCommissionId: {
      in: sourceCommissionIds,
    },
    OR: [
      {
        status: "pending" as const,
      },
      {
        status: "processed" as const,
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
      commissions: originalCommissions,
      newStatus: sourceCommissionStatus,
    }),
  ]);

  console.log(`Voided ${originalCommissions.length} referral commissions.`);
}

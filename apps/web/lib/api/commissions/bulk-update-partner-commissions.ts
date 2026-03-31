import {
  bulkUpdateCommissionsSchema,
  PAYOUT_STATUSES_BLOCKING_COMMISSION_UPDATE,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { DubApiError } from "../errors";
import { syncTotalCommissions } from "../partners/sync-total-commissions";
import { reconcilePayoutAmounts } from "./reconcile-payout-amounts";
import { trackCommissionActivityLog } from "./track-commission-update-activity-log";

type BulkUpdatePartnerCommissionsProps = z.infer<
  typeof bulkUpdateCommissionsSchema
> & {
  workspaceId: string;
  programId: string;
  userId: string;
};

// TODO:
// Send email to partners about the commission update

export async function bulkUpdatePartnerCommissions({
  workspaceId,
  programId,
  commissionIds,
  status,
  userId,
}: BulkUpdatePartnerCommissionsProps) {
  const commissions = await prisma.commission.findMany({
    where: {
      programId,
      id: {
        in: commissionIds,
      },
    },
    include: {
      program: {
        select: {
          workspaceId: true,
        },
      },
      payout: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  if (commissions.length !== commissionIds.length) {
    throw new DubApiError({
      code: "not_found",
      message:
        "One or more commissions were not found in this program or the IDs are invalid.",
    });
  }

  const paidIds = commissions
    .filter((c) => c.status === "paid")
    .map((c) => c.id);

  if (paidIds.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `Cannot update commissions: The following commission(s) have already been paid: ${paidIds.join(", ")}`,
    });
  }

  const blockedByPayout = commissions.filter(
    (c) =>
      c.payout &&
      PAYOUT_STATUSES_BLOCKING_COMMISSION_UPDATE.includes(c.payout.status),
  );

  if (blockedByPayout.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `Cannot update commissions: ${blockedByPayout.map((c) => `${c.id} (its payout is already ${c.payout!.status})`).join(", ")}`,
    });
  }

  const alreadyTargetIds = commissions
    .filter((c) => c.status === status)
    .map((c) => c.id);

  if (alreadyTargetIds.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `The following commission(s) are already in the ${status} status: ${alreadyTargetIds.join(", ")}`,
    });
  }

  // Update the commissions to the new status
  await prisma.commission.updateMany({
    where: {
      programId,
      id: {
        in: commissionIds,
      },
    },
    data: {
      status,
      payoutId: null,
    },
  });

  // Reconcile the payout amounts
  const payoutIds = commissions
    .filter((c) => c.payoutId)
    .map((c) => c.payoutId!);

  await reconcilePayoutAmounts(payoutIds);

  // Retrieve the updated commissions
  const updatedCommissions = await prisma.commission.findMany({
    where: {
      programId,
      id: {
        in: commissionIds,
      },
    },
    include: {
      customer: true,
      partner: true,
      programEnrollment: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  // Find unique partner Ids
  const partnerIds = [...new Set(updatedCommissions.map((c) => c.partnerId))];

  waitUntil(
    Promise.allSettled([
      ...partnerIds.map((partnerId) =>
        syncTotalCommissions({
          partnerId,
          programId,
        }),
      ),

      trackCommissionActivityLog({
        workspaceId,
        programId,
        userId,
        old: commissions,
        new: updatedCommissions,
      }),
    ]),
  );

  return updatedCommissions;
}

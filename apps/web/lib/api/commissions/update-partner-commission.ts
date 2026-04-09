import { convertCurrency } from "@/lib/analytics/convert-currency";
import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { updateCommissionSchemaExtended } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { Commission } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { DubApiError } from "../errors";
import { syncTotalCommissions } from "../partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";
import { calculateSaleEarnings } from "../sales/calculate-sale-earnings";
import { reconcilePayoutAmounts } from "./reconcile-payout-amounts";
import {
  trackCommissionActivityLog,
  trackCommissionStatusUpdate,
} from "./track-commission-update-activity-log";

type UpdatePartnerCommissionProps = z.infer<
  typeof updateCommissionSchemaExtended
> & {
  workspaceId: string;
  programId: string;
  commissionId: string;
  userId?: string;
};

// TODO:
// Send email to partners about the commission update

export async function updatePartnerCommission({
  workspaceId,
  programId,
  commissionId,
  // Common commission fields
  status,
  userId,
  earnings,
  // Sale commission fields
  saleAmount,
  modifySaleAmount,
  currency,
  // Custom commission fields
  updateHistoricalCommissions = false,
}: UpdatePartnerCommissionProps) {
  const commission = await prisma.commission.findUnique({
    where: {
      id: commissionId,
    },
    include: {
      payout: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
      partner: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!commission || commission.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: `Commission ${commissionId} not found.`,
    });
  }

  if (commission.status === "paid") {
    throw new DubApiError({
      code: "bad_request",
      message: `Cannot update commission: Commission ${commissionId} has already been paid.`,
    });
  }

  if (
    commission.payout &&
    !MUTABLE_PAYOUT_STATUSES.includes(commission.payout.status)
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `Cannot update commission: Its payout is already ${commission.payout.status}.`,
    });
  }

  if (status && status === commission.status) {
    throw new DubApiError({
      code: "bad_request",
      message: `This commission is already in the ${status} status.`,
    });
  }

  const { partner, amount: originalSaleAmount } = commission;

  let finalSaleAmount: number | undefined;
  let finalEarnings: number | undefined;

  // Commission for sale events
  if (saleAmount !== undefined || modifySaleAmount !== undefined) {
    if (commission.type !== "sale") {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot update sale amount: Commission ${commissionId} is not a sale commission.`,
      });
    }

    // if currency is not USD, convert it to USD  based on the current FX rate
    // TODO: allow custom "defaultCurrency" on workspace table in the future
    if (currency !== "usd") {
      const valueToConvert = modifySaleAmount ?? saleAmount;

      if (valueToConvert !== undefined) {
        const { currency: convertedCurrency, amount: convertedAmount } =
          await convertCurrency({
            currency,
            amount: valueToConvert,
          });

        if (modifySaleAmount !== undefined) {
          modifySaleAmount = convertedAmount;
        } else {
          saleAmount = convertedAmount;
        }

        currency = convertedCurrency;
      }
    }

    finalSaleAmount = Math.max(
      modifySaleAmount !== undefined
        ? originalSaleAmount + modifySaleAmount
        : saleAmount ?? originalSaleAmount,
      0, // Ensure the amount is not negative
    );

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {
        partner: true,
        links: true,
        saleReward: true,
      },
    });

    const reward = determinePartnerReward({
      event: "sale",
      programEnrollment,
    });

    if (!reward) {
      throw new DubApiError({
        code: "not_found",
        message: `No reward found for partner ${partner.id} in program ${programId}.`,
      });
    }

    // Recalculate the earnings based on the new amount
    finalEarnings = calculateSaleEarnings({
      reward,
      sale: {
        amount: finalSaleAmount,
        quantity: commission.quantity,
      },
    });
  }

  // for sale commissions, if earnings is provided,
  // it will override the earnings calculated based on the sale amount and currency
  if (earnings !== undefined) {
    finalEarnings = earnings;
  }

  const isRefunded = finalSaleAmount === 0 || finalEarnings === 0;
  const finalStatus = status ?? (isRefunded ? "refunded" : undefined);

  const updatedCommission = await prisma.commission.update({
    where: {
      id: commission.id,
      status: {
        not: "paid",
      },
      OR: [
        {
          payoutId: null,
        },
        {
          payout: {
            status: {
              in: MUTABLE_PAYOUT_STATUSES,
            },
          },
        },
      ],
    },
    data: {
      // if the sale/commission is fully refunded, we don't need to update the amount or earnings
      // we just update status to refunded and exclude it from the payout
      // same goes for updating status to refunded, duplicate, canceled, or fraudulent
      amount: isRefunded ? undefined : finalSaleAmount,
      earnings: isRefunded ? undefined : finalEarnings,
      status: finalStatus,
      ...(finalStatus ? { payoutId: null } : {}),
    },
    include: {
      customer: true,
      partner: true,
    },
  });

  // For fraud/canceled on sale/lead commissions, also update all related
  // historical commissions for the same customer + partner combination
  let relatedCommissions: Pick<
    Commission,
    "id" | "amount" | "earnings" | "status" | "payoutId"
  >[] = [];

  if (
    updateHistoricalCommissions &&
    (finalStatus === "fraud" || finalStatus === "canceled") &&
    (commission.type === "sale" || commission.type === "lead")
  ) {
    relatedCommissions = await prisma.commission.findMany({
      where: {
        programId: commission.programId,
        partnerId: commission.partnerId,
        customerId: commission.customerId,
        status: {
          in: ["pending", "processed"],
        },
        id: {
          not: commission.id,
        },
      },
      select: {
        id: true,
        amount: true,
        earnings: true,
        status: true,
        payoutId: true,
      },
    });

    if (relatedCommissions.length > 0) {
      await prisma.commission.updateMany({
        where: {
          id: {
            in: relatedCommissions.map(({ id }) => id),
          },
          status: {
            not: "paid",
          },
          OR: [
            {
              payoutId: null,
            },
            {
              payout: {
                status: {
                  in: MUTABLE_PAYOUT_STATUSES,
                },
              },
            },
          ],
        },
        data: {
          status: finalStatus,
          payoutId: null,
        },
      });
    }
  }

  // Reconcile payout amounts for all affected payouts
  const affectedPayoutIds = [
    ...(commission.status === "processed" && commission.payoutId
      ? [commission.payoutId]
      : []),
    ...relatedCommissions
      .filter(({ payoutId }) => payoutId)
      .map(({ payoutId }) => payoutId!),
  ];

  if (affectedPayoutIds.length > 0) {
    await reconcilePayoutAmounts(affectedPayoutIds);
  }

  waitUntil(
    Promise.allSettled([
      syncTotalCommissions({
        partnerId: commission.partnerId,
        programId: commission.programId,
      }),

      trackCommissionActivityLog({
        workspaceId,
        programId,
        userId,
        old: [commission],
        new: [updatedCommission],
      }),

      relatedCommissions.length > 0
        ? trackCommissionStatusUpdate({
            workspaceId,
            programId,
            userId,
            commissions: relatedCommissions,
            newStatus: finalStatus!,
          })
        : Promise.resolve(),
    ]),
  );

  return updatedCommission;
}

import { convertCurrency } from "@/lib/analytics/convert-currency";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { updateCommissionSchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { DubApiError } from "../errors";
import { syncTotalCommissions } from "../partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";
import { calculateSaleEarnings } from "../sales/calculate-sale-earnings";

type UpdatePartnerCommissionProps = z.infer<typeof updateCommissionSchema> & {
  // workspaceId: string;
  programId: string;
  commissionId: string;
  // user: Session["user"];
};

// TODO:
// Track activity log
// Send email to partners

export async function updatePartnerCommission({
  programId,
  commissionId,
  status,

  // Sale commission fields
  saleAmount,
  modifySaleAmount,
  currency,

  // Custom commission fields
  earnings,
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

  console.log("Commission to update", commission);

  if (commission.status === "paid") {
    throw new DubApiError({
      code: "bad_request",
      message: `Cannot update commission: Commission ${commissionId} has already been paid.`,
    });
  }

  if (status && status === commission.status) {
    throw new DubApiError({
      code: "bad_request",
      message: `This commission is already in the ${status} status.`,
    });
  }

  const {
    partner,
    amount: originalSaleAmount,
    earnings: originalEarnings,
  } = commission;

  let finalSaleAmount: number | undefined;
  let finalEarnings: number | undefined;

  // Commission for sale events
  if (saleAmount || modifySaleAmount) {
    if (commission.type !== "sale") {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot update sale amount: Commission ${commissionId} is not a sale commission.`,
      });
    }

    // if currency is not USD, convert it to USD  based on the current FX rate
    // TODO: allow custom "defaultCurrency" on workspace table in the future
    if (currency !== "usd") {
      const valueToConvert = modifySaleAmount || saleAmount;

      if (valueToConvert) {
        const { currency: convertedCurrency, amount: convertedAmount } =
          await convertCurrency({
            currency,
            amount: valueToConvert,
          });

        if (modifySaleAmount) {
          modifySaleAmount = convertedAmount;
        } else {
          saleAmount = convertedAmount;
        }

        currency = convertedCurrency;
      }
    }

    finalSaleAmount = Math.max(
      modifySaleAmount
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

  // Commission for custom events
  if (earnings) {
    if (commission.type !== "custom") {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot update earnings: Commission ${commissionId} is not a custom commission.`,
      });
    }

    finalEarnings = earnings;
  }

  console.log("New values", {
    finalSaleAmount,
    finalEarnings,
    originalSaleAmount,
    originalEarnings,
    status,
  });

  const isRefunded = finalSaleAmount === 0 || finalEarnings === 0;

  const updatedCommission = await prisma.commission.update({
    where: {
      id: commission.id,
    },
    data: {
      // if the sale/commission is fully refunded, we don't need to update the amount or earnings
      // we just update status to refunded and exclude it from the payout
      // same goes for updating status to refunded, duplicate, canceled, or fraudulent
      amount: isRefunded ? undefined : finalSaleAmount,
      earnings: isRefunded ? undefined : finalEarnings,
      status: status ?? (isRefunded ? "refunded" : undefined),
      ...(status || isRefunded ? { payoutId: null } : {}),
    },
    include: {
      customer: true,
    },
  });

  // If the commission has already been added to a payout, we need to update the payout amount
  if (commission.status === "processed" && commission.payoutId) {
    await reconcilePayoutAmount(commission.payoutId);
  }

  waitUntil(
    Promise.allSettled([
      syncTotalCommissions({
        partnerId: commission.partnerId,
        programId: commission.programId,
      }),
    ]),
  );

  return updatedCommission;
}

// Reconcile the payout amount
async function reconcilePayoutAmount(payoutId: string) {
  return await prisma.$transaction(async (tx) => {
    const commissionAggregate = await tx.commission.aggregate({
      where: {
        payoutId,
      },
      _sum: {
        earnings: true,
      },
    });

    const newPayoutAmount = commissionAggregate._sum.earnings ?? 0;

    // if the payout amount is 0, delete the payout
    if (newPayoutAmount === 0) {
      await tx.payout.delete({
        where: {
          id: payoutId,
        },
      });

      console.log(
        `[reconcilePayoutAmount] Deleted payout ${payoutId} because it has no commissions.`,
      );

      return;
    }

    // otherwise, update the payout amount
    await tx.payout.update({
      where: {
        id: payoutId,
      },
      data: {
        amount: newPayoutAmount,
      },
    });

    console.log(
      `[reconcilePayoutAmount] Updated payout amount for payout ${payoutId} to ${newPayoutAmount}`,
    );
  });
}

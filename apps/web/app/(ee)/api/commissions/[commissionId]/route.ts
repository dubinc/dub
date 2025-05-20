import { DubApiError } from "@/lib/api/errors";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { redis } from "@/lib/upstash";
import {
  CommissionSchema,
  updateCommissionSchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/commissions/:commissionId - update a commission
export const PATCH = withWorkspace(async ({ workspace, params, req }) => {
  const programId = workspace.defaultProgramId!;

  const { commissionId } = params;

  const commission = await prisma.commission.findUnique({
    where: {
      id: commissionId,
    },
    include: {
      partner: true,
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
      message: `Cannot update amount: Commission ${commissionId} has already been paid.`,
    });
  }

  const { partner, amount: originalAmount } = commission;

  let { amount, modifyAmount, currency, status } = updateCommissionSchema.parse(
    await parseRequestBody(req),
  );

  // if currency is not USD, convert it to USD  based on the current FX rate
  // TODO: allow custom "defaultCurrency" on workspace table in the future
  if (currency !== "usd") {
    const fxRates = await redis.hget("fxRates:usd", currency.toUpperCase()); // e.g. for MYR it'll be around 4.4
    if (fxRates) {
      currency = "usd";
      // convert amount to USD (in cents) based on the current FX rate
      // round it to 0 decimal places
      amount = Math.round(originalAmount / Number(fxRates));
      modifyAmount = modifyAmount
        ? Math.round(modifyAmount / Number(fxRates))
        : undefined;
    }
  }

  let finalAmount: number | undefined;
  let finalEarnings: number | undefined;
  let earningsDifference: number | undefined;

  if (status) {
    // if status is being set to refunded, duplicate, canceled, or fraudulent
    // we need to decrement the payout amount by the commission earnings
    earningsDifference = -commission.earnings;
  } else if (amount || modifyAmount) {
    finalAmount = Math.max(
      modifyAmount ? originalAmount + modifyAmount : amount ?? originalAmount,
      0, // Ensure the amount is not negative
    );

    const reward = await determinePartnerReward({
      event: "sale",
      partnerId: partner.id,
      programId,
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
        amount: finalAmount,
        quantity: commission.quantity,
      },
    });

    earningsDifference = finalEarnings - commission.earnings;
  }

  const updatedCommission = await prisma.commission.update({
    where: {
      id: commission.id,
    },
    data: {
      amount: finalAmount,
      earnings: finalEarnings,
      status,
    },
  });

  // If the sale has already been paid, we need to update the payout
  if (
    earningsDifference &&
    commission.status === "processed" &&
    commission.payoutId
  ) {
    waitUntil(
      prisma.payout.update({
        where: {
          id: commission.payoutId,
        },
        data: {
          amount: {
            ...(earningsDifference < 0
              ? { decrement: Math.abs(earningsDifference) }
              : { increment: earningsDifference }),
          },
        },
      }),
    );
  }

  return NextResponse.json(CommissionSchema.parse(updatedCommission));
});

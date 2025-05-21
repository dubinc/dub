import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth/workspace";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { redis } from "@/lib/upstash";
import { CommissionSchema } from "@/lib/zod/schemas/commissions";
import { updatePartnerSaleSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/partners/sales - update a commission
// TODO: move to PATCH /api/commissions
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { invoiceId, amount, modifyAmount, currency } =
      updatePartnerSaleSchema.parse(await parseRequestBody(req));

    const commission = await prisma.commission.findUnique({
      where: {
        programId_invoiceId: {
          programId,
          invoiceId,
        },
      },
      include: {
        partner: true,
      },
    });

    if (!commission) {
      throw new DubApiError({
        code: "not_found",
        message: `Commission with invoice ID ${invoiceId} not found for program ${programId}.`,
      });
    }

    if (commission.status === "paid") {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot update amount: Commission with invoice ID ${invoiceId} has already been paid.`,
      });
    }

    const { partner, amount: originalAmount } = commission;

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

    const finalAmount = modifyAmount
      ? originalAmount + modifyAmount
      : amount ?? originalAmount;

    const reward = await determinePartnerReward({
      event: "sale",
      partnerId: partner.id,
      programId: programId,
    });

    if (!reward) {
      throw new DubApiError({
        code: "not_found",
        message: `No reward found for partner ${partner.id} in program ${programId}.`,
      });
    }

    // Recalculate the earnings based on the new amount
    const finalEarnings = calculateSaleEarnings({
      reward,
      sale: {
        amount: finalAmount,
        quantity: commission.quantity,
      },
    });

    const updatedCommission = await prisma.commission.update({
      where: {
        id: commission.id,
      },
      data: {
        amount: finalAmount,
        earnings: finalEarnings,
      },
    });

    // TODO:
    // Check the reward limit

    const amountDifference = finalAmount - commission.amount;
    const earningsDifference = finalEarnings - commission.earnings;

    // If the sale has already been paid, we need to update the payout
    if (
      amountDifference !== 0 &&
      commission.status === "processed" &&
      commission.payoutId
    ) {
      await prisma.payout.update({
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
      });
    }

    return NextResponse.json(CommissionSchema.parse(updatedCommission));
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

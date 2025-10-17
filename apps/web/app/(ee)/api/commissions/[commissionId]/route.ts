import { convertCurrency } from "@/lib/analytics/convert-currency";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import {
  CommissionEnrichedSchema,
  updateCommissionSchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/commissions/:commissionId - update a commission
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { commissionId } = params;

    const commission = await prisma.commission.findUnique({
      where: {
        id: commissionId,
        programId,
      },
      include: {
        partner: true,
      },
    });

    if (!commission) {
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

    let { amount, modifyAmount, currency, status } =
      updateCommissionSchema.parse(await parseRequestBody(req));

    let finalAmount: number | undefined;
    let finalEarnings: number | undefined;

    if (amount || modifyAmount) {
      if (commission.type !== "sale") {
        throw new DubApiError({
          code: "bad_request",
          message: `Cannot update amount: Commission ${commissionId} is not a sale commission.`,
        });
      }

      // if currency is not USD, convert it to USD  based on the current FX rate
      // TODO: allow custom "defaultCurrency" on workspace table in the future
      if (currency !== "usd") {
        const valueToConvert = modifyAmount || amount;
        if (valueToConvert) {
          const { currency: convertedCurrency, amount: convertedAmount } =
            await convertCurrency({ currency, amount: valueToConvert });

          if (modifyAmount) {
            modifyAmount = convertedAmount;
          } else {
            amount = convertedAmount;
          }
          currency = convertedCurrency;
        }
      }

      finalAmount = Math.max(
        modifyAmount ? originalAmount + modifyAmount : amount ?? originalAmount,
        0, // Ensure the amount is not negative
      );

      const programEnrollment = await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId,
        include: {
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
          amount: finalAmount,
          quantity: commission.quantity,
        },
      });
    }

    const isRefunded = finalAmount === 0 || finalEarnings === 0;

    const updatedCommission = await prisma.commission.update({
      where: {
        id: commission.id,
      },
      data: {
        // if the sale/commission is fully refunded, we don't need to update the amount or earnings
        // we just update status to refunded and exclude it from the payout
        // same goes for updating status to refunded, duplicate, canceled, or fraudulent
        amount: isRefunded ? undefined : finalAmount,
        earnings: isRefunded ? undefined : finalEarnings,
        status: status ?? (isRefunded ? "refunded" : undefined),
        ...(status || isRefunded ? { payoutId: null } : {}),
      },
      include: {
        customer: true,
        partner: true,
      },
    });

    // If the commission has already been added to a payout, we need to update the payout amount
    if (commission.status === "processed" && commission.payoutId) {
      waitUntil(
        prisma.$transaction(async (tx) => {
          const commissionAggregate = await tx.commission.aggregate({
            where: {
              payoutId: commission.payoutId,
            },
            _sum: {
              earnings: true,
            },
          });

          const newPayoutAmount = commissionAggregate._sum.earnings ?? 0;

          if (newPayoutAmount === 0) {
            console.log(`Deleting payout ${commission.payoutId}`);
            await tx.payout.delete({ where: { id: commission.payoutId! } });
          } else {
            console.log(
              `Updating payout ${commission.payoutId} to ${newPayoutAmount}`,
            );
            await tx.payout.update({
              where: { id: commission.payoutId! },
              data: { amount: newPayoutAmount },
            });
          }
        }),
      );
    }

    waitUntil(
      Promise.allSettled([
        syncTotalCommissions({
          partnerId: commission.partnerId,
          programId: commission.programId,
        }),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "commission.updated",
          description: `Commission ${commissionId} updated`,
          actor: session.user,
          targets: [
            {
              type: "commission",
              id: commission.id,
              metadata: updatedCommission,
            },
          ],
        }),
      ]),
    );

    return NextResponse.json(CommissionEnrichedSchema.parse(updatedCommission));
  },
);

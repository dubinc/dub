import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth/workspace";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { redis } from "@/lib/upstash";
import { updatePartnerSaleSchema } from "@/lib/zod/schemas/partners";
import { ProgramSaleSchema } from "@/lib/zod/schemas/program-sales";
import { prisma } from "@dub/prisma";
import { Payout } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/partners/sales - update a sale
export const PATCH = withWorkspace(
  async ({ req, workspace, session }) => {
    let { programId, invoiceId, amount, modifyAmount, currency } =
      updatePartnerSaleSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const sale = await prisma.commission.findUnique({
      where: {
        programId_invoiceId: {
          programId: program.id,
          invoiceId,
        },
      },
      include: {
        partner: true,
      },
    });

    if (!sale) {
      throw new DubApiError({
        code: "not_found",
        message: `Sale with invoice ID ${invoiceId} not found for program ${programId}.`,
      });
    }

    if (sale.status === "paid") {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot update amount: Sale with invoice ID ${invoiceId} has already been paid.`,
      });
    }

    const { partner, amount: originalAmount } = sale;

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
      programId: program.id,
    });

    if (!reward) {
      throw new DubApiError({
        code: "not_found",
        message: `No reward found for partner ${partner.id} in program ${program.id}.`,
      });
    }

    // Recalculate the earnings based on the new amount
    const finalEarnings = calculateSaleEarnings({
      reward,
      sale: {
        amount: finalAmount,
        quantity: sale.quantity,
      },
    });

    const updatedSale = await prisma.commission.update({
      where: {
        id: sale.id,
      },
      data: {
        amount: finalAmount,
        earnings: finalEarnings,
      },
    });

    const amountDifference = finalAmount - sale.amount;
    const earningsDifference = finalEarnings - sale.earnings;
    let updatedPayout: Payout | null = null;

    if (amountDifference !== 0) {
      const [_, payout] = await Promise.all([
        // update link sales
        prisma.link.update({
          where: {
            id: sale.linkId,
          },
          data: {
            saleAmount: {
              ...(amountDifference < 0
                ? { decrement: Math.abs(amountDifference) }
                : { increment: amountDifference }),
            },
          },
        }),

        // If the sale has already been paid, we need to update the payout
        sale.status === "processed" &&
          sale.payoutId &&
          prisma.payout.update({
            where: {
              id: sale.payoutId,
            },
            data: {
              amount: {
                ...(earningsDifference < 0
                  ? { decrement: Math.abs(earningsDifference) }
                  : { increment: earningsDifference }),
              },
            },
          }),
      ]);

      if (payout) {
        updatedPayout = payout;
      }
    }

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId: programId,
        event: "sale.update",
        actor: session.user,
        targets: [
          {
            type: "sale",
            id: sale.id,
            metadata: {
              amount: updatedSale.amount,
              earnings: updatedSale.earnings,
              status: updatedSale.status,
            },
          },
          ...(updatedPayout
            ? [
                {
                  type: "payout" as const,
                  id: updatedPayout.id,
                  metadata: {
                    amount: updatedPayout.amount,
                    status: updatedPayout.status,
                    quantity: updatedPayout.quantity,
                  },
                },
              ]
            : []),
        ],
      }),
    );

    return NextResponse.json(ProgramSaleSchema.parse(updatedSale));
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

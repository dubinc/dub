import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import {
  MIN_WITHDRAWAL_AMOUNT_CENTS,
  STABLECOIN_PAYOUT_FIXED_FEE_CENTS,
} from "@/lib/constants/payouts";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { mockPayoutCompletion } from "@/lib/sandbox/mock-payout-completion";
import { fundFinancialAccount } from "@/lib/stripe/fund-financial-account";
import { prisma } from "@dub/prisma";
import { WorkspaceEnvironment } from "@dub/prisma/client";
import { log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { queueExternalPayouts } from "./queue-external-payouts";
import { queueStripePayouts } from "./queue-stripe-payouts";
import { queueTremendousPayouts } from "./queue-tremendous-payouts";
import { sendPaypalPayouts } from "./send-paypal-payouts";
import { scheduleDelayedStablecoinPayouts } from "./utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // This function can run for a maximum of 10 minutes

const payloadSchema = z.object({
  invoiceId: z.string(),
});

// POST /api/cron/payouts/charge-succeeded
// This route is used to process the charge-succeeded event from Stripe.
// We're intentionally offloading this to a cron job so we can return a 200 to Stripe immediately.
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { invoiceId } = payloadSchema.parse(JSON.parse(rawBody));

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        _count: {
          select: {
            payouts: {
              where: {
                status: "processing",
              },
            },
          },
        },
        program: {
          select: {
            workspace: {
              select: {
                environment: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return logAndRespond(`Invoice ${invoiceId} not found.`);
    }

    if (invoice._count.payouts === 0) {
      return logAndRespond(
        `No payouts found with status 'processing' for invoice ${invoiceId}, skipping...`,
      );
    }

    if (!invoice.program || !invoice.program.workspace) {
      return logAndRespond(
        `Invoice ${invoiceId} has no program or workspace, skipping...`,
      );
    }

    const isProductionWorkspace =
      invoice.program.workspace.environment === WorkspaceEnvironment.production;

    // Set the method for each payout in the invoice to the corresponding partner's default payout method
    await prisma.$executeRaw`
      UPDATE Payout p
      INNER JOIN Partner pn ON p.partnerId = pn.id
      SET p.method = pn.defaultPayoutMethod
      WHERE p.invoiceId = ${invoice.id}
      AND pn.defaultPayoutMethod IS NOT NULL
      AND p.status = 'processing'
    `;

    // Fund the total stablecoin payout amount for this invoice
    const { _sum, _count } = await prisma.payout.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        invoiceId: invoice.id,
        method: "stablecoin",
        // only transfer funds for stablecoin payouts >= minimum withdrawal amount
        // for payouts below the minimum withdrawal amount, we will just mark them as processed
        // and users can force withdraw them manually later (which triggers another fundFinancialAccount call)
        amount: {
          gte: MIN_WITHDRAWAL_AMOUNT_CENTS,
        },
      },
    });

    let skipStablecoinPayouts = false;
    // we need to add the STABLECOIN_PAYOUT_FIXED_FEE_CENTS for each payout to the total funding amount
    // to make sure that `createStablecoinPayout` later has enough funds to cover Stripe's fees
    const stablecoinFundingAmount =
      (_sum.amount ?? 0) + _count.id * STABLECOIN_PAYOUT_FIXED_FEE_CENTS;

    // Send money to Financial Account to handle stablecoin payouts
    if (isProductionWorkspace && stablecoinFundingAmount > 0) {
      const { nextAction } = await scheduleDelayedStablecoinPayouts(invoice);

      if (nextAction === "executeNow") {
        try {
          await fundFinancialAccount({
            amount: stablecoinFundingAmount,
            idempotencyKey: invoiceId,
          });
        } catch (error) {
          await log({
            message: `Failed to fund Dub's financial account for stablecoin payouts: ${error.message}`,
            type: "errors",
          });

          skipStablecoinPayouts = true;
        }
      }

      if (nextAction === "skip") {
        skipStablecoinPayouts = true;
      }
    }

    await Promise.allSettled([
      ...(isProductionWorkspace
        ? [
            // Queue Stripe payouts
            queueStripePayouts(invoice, skipStablecoinPayouts),

            // Send PayPal payouts
            sendPaypalPayouts(invoice),

            // Queue Tremendous payouts
            queueTremendousPayouts(invoice),
          ]
        : []),

      // Queue external payouts
      queueExternalPayouts(invoice),

      // Mock sandbox payouts
      ...(!isProductionWorkspace
        ? [
            mockPayoutCompletion({
              invoice,
              workspace: invoice.program.workspace,
            }),
          ]
        : []),
    ]);

    return logAndRespond(
      `Completed processing all payouts for invoice ${invoiceId}.`,
    );
  } catch (error) {
    await log({
      message: `Error sending payouts for invoice: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

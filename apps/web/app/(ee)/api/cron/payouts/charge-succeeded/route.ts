import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { fundFinancialAccount } from "@/lib/stripe/fund-financial-account";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { queueExternalPayouts } from "./queue-external-payouts";
import { queueStripePayouts } from "./queue-stripe-payouts";
import { sendPaypalPayouts } from "./send-paypal-payouts";

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

    // Set the method for each payout in the invoice to the corresponding partner's default payout method
    await prisma.$executeRaw`
      UPDATE Payout p
      INNER JOIN Partner pr ON p.partnerId = pr.id
      SET p.method = pr.defaultPayoutMethod
      WHERE p.invoiceId = ${invoice.id}
      AND pr.defaultPayoutMethod IS NOT NULL
      AND p.status = 'processing'
    `;

    // Fund only the net amount we actually pay out (after the 1% stablecoin fee).
    // We compute this per partner to match the rounding used in `createStripeTransfer`.
    const stablecoinPayoutsByPartner = await prisma.payout.groupBy({
      by: ["partnerId"],
      _sum: {
        amount: true,
      },
      where: {
        invoiceId: invoice.id,
        method: "stablecoin",
      },
    });

    const stablecoinFundingAmount = stablecoinPayoutsByPartner.reduce(
      (total, payout) => {
        const partnerPayoutAmount = payout._sum.amount ?? 0;

        if (partnerPayoutAmount <= 0) {
          return total;
        }

        return total + partnerPayoutAmount;
      },
      0,
    );

    // Send money to Dub's Financial Account to handle Stablecoin payouts
    if (stablecoinFundingAmount > 0) {
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
      }
    }

    await Promise.allSettled([
      // Queue Stripe payouts
      queueStripePayouts(invoice),
      // Send PayPal payouts
      sendPaypalPayouts(invoice),
      // Queue external payouts
      queueExternalPayouts(invoice),
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

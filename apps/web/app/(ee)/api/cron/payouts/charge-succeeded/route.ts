import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
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

    // Update payout method from partner's defaultPayoutMethod
    await prisma.$executeRaw`
      UPDATE Payout p
      INNER JOIN Partner pr ON p.partnerId = pr.id
      SET p.method = pr.defaultPayoutMethod
      WHERE p.invoiceId = ${invoice.id}
      AND pr.defaultPayoutMethod IS NOT NULL
    `;

    // Find the total amount we should transfer to FA to handle Stablecoin payouts
    const {
      _sum: { amount: totalStablecoinPayoutAmount },
    } = await prisma.payout.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        invoiceId: invoice.id,
        method: "stablecoin",
      },
    });

    // TODO
    // Fix "Some fields in the request were invalid: 'from.payment_method: The Payment Method ID is invalid.'", error from Stripe

    // Make an inbound transfer to Dub's financial account to handle Stablecoin payouts
    // if (totalStablecoinPayoutAmount && totalStablecoinPayoutAmount > 0) {
    //   await createStripeInboundTransfer({
    //     amount: totalStablecoinPayoutAmount,
    //   });
    // }

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

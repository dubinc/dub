import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { PartnerPayoutMethod } from "@prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { queueExternalPayouts } from "./queue-external-payouts";
import { queueStripePayouts } from "./queue-stripe-payouts";
import { queueTremendousPayouts } from "./queue-tremendous-payouts";
import { sendPaypalPayouts } from "./send-paypal-payouts";
import { getFundSettlementTiming, scheduleDelayedPayouts } from "./utils";

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
      INNER JOIN Partner pn ON p.partnerId = pn.id
      SET p.method = pn.defaultPayoutMethod
      WHERE p.invoiceId = ${invoice.id}
      AND pn.defaultPayoutMethod IS NOT NULL
      AND p.status = 'processing'
    `;

    let fundsAvailable = true;

    // if invoice payment method is card, we need to check if the funds have settled yet
    if (invoice.paymentMethod === "card") {
      const fundSettlementTiming = await getFundSettlementTiming(invoice);
      if (!fundSettlementTiming.fundsAvailable) {
        // set fundsAvailable to false so we don't queue any payouts that require funds to be available
        fundsAvailable = false;

        const postSettlementPayoutMethods = [
          PartnerPayoutMethod.stablecoin,
          PartnerPayoutMethod.paypal,
          PartnerPayoutMethod.tremendous,
        ];

        const postSettlementPayoutsCount = await prisma.payout.count({
          where: {
            invoiceId: invoice.id,
            status: "processing",
            method: {
              in: postSettlementPayoutMethods,
            },
          },
        });

        if (postSettlementPayoutsCount > 0) {
          await scheduleDelayedPayouts({
            invoice,
            executeAt: fundSettlementTiming.scheduledAt,
          });
        }
      }
    }

    await Promise.allSettled([
      // Queue Stripe payouts (need to pass along fundsAvailable to handle stablecoin payouts)
      queueStripePayouts({
        invoice,
        fundsAvailable,
      }),

      // only send PayPal and Tremendous payouts if funds are available
      ...(fundsAvailable
        ? [
            sendPaypalPayouts({
              invoice,
            }),
            queueTremendousPayouts({
              invoice,
            }),
          ]
        : []),

      // Queue external payouts (doesn't rely on fundsAvailable)
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

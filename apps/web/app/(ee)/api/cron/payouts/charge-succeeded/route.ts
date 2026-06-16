import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { log } from "@dub/utils";
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
      AND p.status = 'processing' AND p.method IS NULL
    `;

    // Get the fund settlement timing
    const fundSettlementTiming = await getFundSettlementTiming(invoice);

    if (!fundSettlementTiming.fundsAvailable) {
      const postSettlementPayoutMethods: PartnerPayoutMethod[] = [
        PartnerPayoutMethod.stablecoin,
        PartnerPayoutMethod.paypal,
        PartnerPayoutMethod.tremendous,
      ];

      const payoutsByMethod = await prisma.payout.groupBy({
        by: ["method"],
        _count: {
          id: true,
        },
        where: {
          invoiceId: invoice.id,
          status: "processing",
          mode: "internal",
          method: {
            in: postSettlementPayoutMethods,
          },
        },
      });

      const shouldSchedulePayouts = payoutsByMethod.some(
        (p) =>
          p.method !== null && postSettlementPayoutMethods.includes(p.method),
      );

      if (shouldSchedulePayouts) {
        await scheduleDelayedPayouts({
          invoice,
          executeAt: fundSettlementTiming.scheduledAt,
        });
      }
    }

    const { fundsAvailable } = fundSettlementTiming;

    await Promise.allSettled([
      // Queue Stripe payouts
      queueStripePayouts({
        invoice,
        fundsAvailable,
      }),

      // Send PayPal payouts
      sendPaypalPayouts({
        invoice,
        fundsAvailable,
      }),

      // Queue Tremendous payouts
      queueTremendousPayouts({
        invoice,
        fundsAvailable,
      }),

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

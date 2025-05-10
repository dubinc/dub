import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { sendPaypalPayouts } from "./send-paypal-payouts";
import { sendStripePayouts } from "./send-stripe-payouts";
import { payloadSchema } from "./utils";

export const dynamic = "force-dynamic";

// POST /api/cron/payouts/charge-succeeded
// This route is used to process the charge-succeeded event from Stripe
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = payloadSchema.parse(JSON.parse(rawBody));
    const { invoiceId } = body;

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        _count: {
          select: {
            payouts: {
              where: {
                status: {
                  not: "completed",
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      console.log(`Invoice with id ${invoiceId} not found.`);
      return new Response(`Invoice with id ${invoiceId} not found.`);
    }

    if (invoice._count.payouts === 0) {
      console.log("No payouts found with status not completed, skipping...");
      return new Response(
        `No payouts found with status not completed for invoice ${invoiceId}`,
      );
    }

    const payouts = await prisma.payout.findMany({
      where: {
        invoiceId,
        status: {
          not: "completed",
        },
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      },
      include: {
        partner: true,
        program: true,
      },
    });

    // we default to paypal if it's connected
    const paypalPayouts = payouts.filter(
      (payout) => payout.partner.paypalEmail,
    );

    // if paypal is not connected, we use stripe
    const stripePayouts = payouts.filter(
      (payout) => payout.partner.stripeConnectId && !payout.partner.paypalEmail,
    );

    await Promise.allSettled([
      sendStripePayouts({
        payload: body,
        payouts: stripePayouts,
      }),

      sendPaypalPayouts({
        payload: body,
        payouts: paypalPayouts,
      }),
    ]);

    return new Response(`Invoice ${invoiceId} processed.`);
  } catch (error) {
    await log({
      message: `Error sending payouts for invoice: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

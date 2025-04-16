import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
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
    const { invoiceId, receiptUrl } = body;

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        payouts: {
          where: {
            status: {
              not: "completed",
            },
          },
        },
      },
    });

    if (!invoice) {
      console.log(`Invoice with id ${invoiceId} not found.`);
      return;
    }

    if (invoice.status === "completed") {
      console.log("Invoice already completed, skipping...");
      return;
    }

    if (invoice.payouts.length === 0) {
      console.log("No payouts found with status not completed, skipping...");
      return;
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

    const stripePayouts = payouts.filter(
      (payout) => payout.partner.stripeConnectId,
    );

    const paypalPayouts = payouts.filter(
      (payout) => payout.partner.paypalEmail,
    );

    await Promise.all([
      sendStripePayouts({ ...body, payouts: stripePayouts }),
      sendPaypalPayouts({ ...body, payouts: paypalPayouts }),
    ]);

    const payoutsNotCompleted = await prisma.payout.count({
      where: {
        invoiceId,
        status: {
          not: "completed",
        },
      },
    });

    if (payoutsNotCompleted === 0) {
      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: "completed",
          paidAt: new Date(),
        },
      });
    }

    return new Response(`Invoice ${invoiceId} processed.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

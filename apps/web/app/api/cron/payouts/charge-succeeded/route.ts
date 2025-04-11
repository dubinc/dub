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

    const payload = payloadSchema.parse(JSON.parse(rawBody));

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: payload.invoiceId,
      },
      include: {
        payouts: {
          where: {
            status: {
              not: "completed",
            },
          },
          include: {
            program: true,
            partner: true,
          },
        },
      },
    });

    if (!invoice) {
      console.log(`Invoice with id ${payload.invoiceId} not found.`);
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

    await sendStripePayouts(payload);
    await sendPaypalPayouts(payload);

    return new Response(`Invoice ${payload.invoiceId} processed.`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

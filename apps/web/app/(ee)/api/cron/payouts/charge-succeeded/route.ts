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
// we're intentionally offloading this to a cron job to avoid blocking the main thread
// so that we can return a 200 to Stripe immediately
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

    await Promise.allSettled([
      sendStripePayouts({
        payload: body,
      }),

      sendPaypalPayouts({
        payload: body,
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

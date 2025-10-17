import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { sendPaypalPayouts } from "./send-paypal-payouts";
import { sendStripePayouts } from "./send-stripe-payouts";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  invoiceId: z.string(),
});

const stripeChargeMetadataSchema = z.object({
  id: z.string(), // Stripe charge id
});

// POST /api/cron/payouts/charge-succeeded
// This route is used to process the charge-succeeded event from Stripe
// we're intentionally offloading this to a cron job to avoid blocking the main thread
// so that we can return a 200 to Stripe immediately
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

    // Find the id of the charge that was used to fund the transfer
    const parsedChargeMetadata = stripeChargeMetadataSchema.safeParse(
      invoice.stripeChargeMetadata,
    );
    const chargeId = parsedChargeMetadata.success
      ? parsedChargeMetadata.data.id
      : undefined;

    // this should never happen since all completed invoices should have a charge id, but just in case
    if (!chargeId) {
      await log({
        message:
          "No charge id found in stripeChargeMetadata for invoice " +
          invoiceId +
          ", continuing without source_transaction.",
        type: "errors",
      });
    }

    await Promise.allSettled([
      sendStripePayouts({
        invoiceId,
        chargeId,
      }),

      sendPaypalPayouts({
        invoiceId,
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

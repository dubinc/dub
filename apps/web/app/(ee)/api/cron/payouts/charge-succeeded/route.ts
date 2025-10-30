import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { sendPaypalPayouts } from "./send-paypal-payouts";
import {
  SEND_PAYOUTS_BATCH_SIZE,
  sendStripePayouts,
} from "./send-stripe-payouts";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // This function can run for a maximum of 10 minutes

const payloadSchema = z.object({
  invoiceId: z.string(),
});

const stripeChargeMetadataSchema = z.object({
  id: z.string(), // Stripe charge id
});

// POST /api/cron/payouts/charge-succeeded
// This route is used to process the charge-succeeded event from Stripe.
// We're intentionally offloading this to a cron job so we can return a 200 to Stripe immediately.
// We'll also be calling this route recursively to process payouts in batches of 100.
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

    if (invoice._count.payouts > SEND_PAYOUTS_BATCH_SIZE) {
      console.log(
        `More than ${SEND_PAYOUTS_BATCH_SIZE} payouts found for invoice, scheduling next batch...`,
      );
      const qstashResponse = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
        body: {
          invoiceId: invoiceId,
        },
      });
      if (qstashResponse.messageId) {
        console.log(
          `Message sent to Qstash with id ${qstashResponse.messageId}`,
        );
      } else {
        // should never happen but just in case
        await log({
          message: `Error sending message to Qstash to schedule next batch of payouts for invoice ${invoiceId}: ${JSON.stringify(qstashResponse)}`,
          type: "errors",
        });
      }

      return logAndRespond(
        `Completed processing current batch of payouts for invoice ${invoiceId}. Next batch scheduled.`,
      );
    }

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

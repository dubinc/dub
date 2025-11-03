import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // This function can run for a maximum of 10 minutes

const payloadSchema = z.object({
  invoiceId: z.string(),
  startingAfter: z.string().optional(),
});

const stripeChargeMetadataSchema = z.object({
  id: z.string(), // Stripe charge id
});

const PAYOUT_BATCH_SIZE = 100;

// POST /api/cron/payouts/send-stripe-payouts
// Send payouts via Stripe for a given invoice
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { invoiceId, startingAfter } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

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
        message: `No charge id found in stripeChargeMetadata for invoice ${invoiceId}, continuing without source_transaction.`,
        type: "errors",
      });
    }

    // Find payouts for Stripe transfers in batches
    const stripePayouts = await prisma.payout.findMany({
      where: {
        invoiceId,
        status: "processing",
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
          stripeConnectId: {
            not: null,
          },
        },
      },
      select: {
        id: true,
        partnerId: true,
      },
      ...(startingAfter && {
        skip: 1,
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
      take: PAYOUT_BATCH_SIZE,
    });

    // If there are payouts to be sent via Stripe, trigger the create-stripe-transfer workflow
    if (stripePayouts.length > 0) {
      await triggerWorkflows(
        stripePayouts.map(({ partnerId }) => ({
          workflowId: "create-stripe-transfer",
          body: {
            partnerId,
            invoiceId,
            chargeId,
          },
        })),
      );
    }

    // Schedule the next batch if not the last batch
    if (stripePayouts.length === PAYOUT_BATCH_SIZE) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payouts`,
        body: {
          invoiceId,
          startingAfter: stripePayouts[stripePayouts.length - 1].id,
        },
      });

      if (!response.messageId) {
        await log({
          message: `Error scheduling next batch of payouts for invoice ${invoiceId}: ${JSON.stringify(response)}`,
          type: "errors",
        });
      }

      return logAndRespond(
        `Scheduled next batch of payouts for invoice ${invoiceId} with QStash message ${response.messageId}`,
      );
    }

    return logAndRespond(
      `Completed processing all payouts for invoice ${invoiceId}.`,
    );
  } catch (error) {
    await log({
      message: `Error sending payouts via Stripe: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}

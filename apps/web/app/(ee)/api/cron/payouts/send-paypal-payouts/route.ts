import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  invoiceId: z.string(),
  startingAfter: z.string().optional(),
  batchNumber: z.number().optional().default(1),
});

const PAYOUT_BATCH_SIZE = 100;

// POST /api/cron/payouts/send-paypal-payouts
// Send payouts via PayPal for a given invoice
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    let { invoiceId, startingAfter, batchNumber } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const payouts = await prisma.payout.findMany({
      where: {
        invoiceId,
        status: "processing",
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
          paypalEmail: {
            not: null,
          },
        },
      },
      include: {
        partner: {
          select: {
            email: true,
            paypalEmail: true,
          },
        },
        program: {
          select: {
            name: true,
            logo: true,
          },
        },
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

    if (payouts.length === 0) {
      return logAndRespond("No payouts for sending via PayPal, skipping...");
    }

    const batchPayout = await createPayPalBatchPayout({
      payouts,
      invoiceId: `${invoiceId}-${batchNumber}`,
    });

    console.log("PayPal batch payout created", batchPayout);

    // Mark the payouts as "sent"
    const updatedPayouts = await prisma.payout.updateMany({
      where: {
        id: {
          in: payouts.map((p) => p.id),
        },
      },
      data: {
        status: "sent",
        paidAt: new Date(),
      },
    });

    console.log(`Updated ${updatedPayouts.count} payouts to "sent" status.`);

    // Send email notification to the partner
    const batchEmails = await sendBatchEmail(
      payouts
        .filter((payout) => payout.partner.email)
        .map((payout) => ({
          variant: "notifications",
          to: payout.partner.email!,
          subject: "You've been paid!",
          react: PartnerPayoutProcessed({
            email: payout.partner.email!,
            program: payout.program,
            payout,
            variant: "paypal",
          }),
        })),
    );

    console.log("Resend batch emails sent", batchEmails);

    // Schedule the next batch if not the last batch
    if (payouts.length === PAYOUT_BATCH_SIZE) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-paypal-payouts`,
        body: {
          invoiceId,
          startingAfter: payouts[payouts.length - 1].id,
          batchNumber: batchNumber + 1,
        },
      });

      if (!response.messageId) {
        throw new Error(
          `Failed to schedule next batch for invoice ${invoiceId}, error: ${JSON.stringify(response)}`,
        );
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
      message: `Error sending payouts via PayPal: ${error instanceof Error ? error.message : String(error)}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

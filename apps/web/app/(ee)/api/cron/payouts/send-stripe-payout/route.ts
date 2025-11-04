import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  invoiceId: z.string(),
  partnerId: z.string(),
  chargeId: z.string().optional(),
});

// POST /api/cron/payouts/send-stripe-payout
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { invoiceId, partnerId, chargeId } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const currentInvoicePayouts = await prisma.payout.findMany({
      where: {
        invoiceId,
        partnerId,
        status: "processing",
      },
      include: {
        partner: true,
        program: true,
      },
    });

    if (!currentInvoicePayouts) {
      return logAndRespond(
        `No "processing" payouts found for partner ${partnerId} and invoice ${invoiceId}`,
      );
    }

    // get all previously processed payouts for the partners in this invoice
    // but haven't been transferred to their Stripe Express account yet
    const previouslyProcessedPayouts = await prisma.payout.findMany({
      where: {
        status: "processed",
        stripeTransferId: null,
        partnerId,
      },
      include: {
        partner: true,
        program: true,
      },
    });

    await createStripeTransfer({
      partner: currentInvoicePayouts[0].partner,
      previouslyProcessedPayouts,
      currentInvoicePayouts,
      chargeId,
    });

    await sendBatchEmail(
      currentInvoicePayouts.map((p) => ({
        variant: "notifications",
        to: p.partner.email!,
        subject: "You've been paid!",
        react: PartnerPayoutProcessed({
          email: p.partner.email!,
          program: p.program,
          payout: p,
          variant: "stripe",
        }),
      })),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await log({
      message: `Error sending Stripe payout: ${errorMessage}`,
      type: "errors",
      mention: true,
    });

    return handleAndReturnErrorResponse(error);
  }
}

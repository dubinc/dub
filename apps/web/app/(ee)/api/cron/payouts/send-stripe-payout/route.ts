import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { sendEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, log } from "@dub/utils";
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

    // there should only be one payout per partner in a given invoice, but just in case there are multiple
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

    if (currentInvoicePayouts.length === 0) {
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

    // again, there should only be one payout per partner in a given invoice
    const payout = currentInvoicePayouts[0];
    if (payout.partner.email) {
      const emailRes = await sendEmail({
        variant: "notifications",
        to: payout.partner.email!,
        subject: `You've received a ${currencyFormatter(payout.amount)} payout from ${payout.program.name}`,
        react: PartnerPayoutProcessed({
          email: payout.partner.email!,
          program: payout.program,
          payout,
          variant: "stripe",
        }),
      });

      console.log(`Resend email sent: ${JSON.stringify(emailRes, null, 2)}`);
    }

    return logAndRespond(
      `Processed send-stripe-payout job for partner ${partnerId} and invoice ${invoiceId}`,
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

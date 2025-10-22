import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendBatchEmail } from "@dub/email";
import { resend } from "@dub/email/resend";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  invoiceId: z.string(),
  startingAfter: z.string().optional(),
});

const MAX_PARTNERS_SIZE = 100;

// POST /api/cron/payouts/notify
// Send emails to all the partners involved in the payouts if the payout method is Direct Debit
// This is because Direct Debit takes 4 business days to process, so we want to give partners a heads up
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

    if (!resend) {
      return logAndRespond("Resend is not configured, skipping email sending.");
    }

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: {
        id: invoiceId,
      },
      select: {
        paymentMethod: true,
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
            supportEmail: true,
          },
        },
      },
    });

    const payouts = await prisma.payout.findMany({
      where: {
        invoiceId,
        status: "processing",
      },
      select: {
        id: true,
        amount: true,
        periodStart: true,
        periodEnd: true,
        partner: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
      skip: startingAfter ? 1 : 0,
      take: MAX_PARTNERS_SIZE,
    });

    if (payouts.length === 0) {
      return logAndRespond(
        `No more payouts to notify for invoice ${invoiceId}.`,
      );
    }

    const program = invoice.program!;

    const { data, error } = await sendBatchEmail(
      payouts.map((payout) => ({
        variant: "notifications",
        to: payout.partner.email!,
        subject: "You've got money coming your way!",
        replyTo: program.supportEmail || "noreply",
        react: PartnerPayoutConfirmed({
          email: payout.partner.email!,
          program,
          payout: {
            id: payout.id,
            amount: payout.amount,
            startDate: payout.periodStart,
            endDate: payout.periodEnd,
            paymentMethod: invoice.paymentMethod ?? "ach",
          },
        }),
      })),
    );

    if (error) {
      console.error(error);
    }

    if (data) {
      console.log(`Sent ${data.length} emails to ${payouts.length} partners.`);

      const flattened = payouts.map((p) => ({
        id: p.id,
        partnerEmail: p.partner.email ?? "(no email)",
        amount: p.amount,
      }));

      console.table(flattened, ["id", "partnerEmail", "amount"]);
    }

    if (payouts.length === MAX_PARTNERS_SIZE) {
      const nextStartingAfter = payouts[payouts.length - 1].id;

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/notify`,
        body: {
          invoiceId,
          startingAfter: nextStartingAfter,
        },
      });

      return logAndRespond(
        `Scheduled next batch (${nextStartingAfter}) for invoice ${invoiceId}.`,
      );
    }

    return logAndRespond(
      `Finished notifying partners about the payouts for invoice ${invoiceId}.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying partners about the payout ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}

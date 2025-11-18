import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, currencyFormatter, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  invoiceId: z.string(),
  startingAfter: z.string().optional(),
});

const BATCH_SIZE = 100;

// POST /api/cron/payouts/process/updates
// Recursive cron job to handle side effects of the `cron/payouts/process` job (recordAuditLog, sendBatchEmails)
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

    const payouts = await prisma.payout.findMany({
      where: {
        invoiceId,
      },
      include: {
        program: true,
        partner: true,
        invoice: true,
      },
      take: BATCH_SIZE,
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    if (payouts.length === 0) {
      return logAndRespond(
        `No more payouts to process for invoice ${invoiceId}. Skipping...`,
      );
    }

    const auditLogResponse = await recordAuditLog(
      payouts.map((payout) => ({
        workspaceId: payout.program.workspaceId,
        programId: payout.program.id,
        action: "payout.confirmed",
        description: `Payout ${payout.id} confirmed`,
        actor: {
          id: payout.userId!,
        },
        targets: [
          {
            type: "payout",
            id: payout.id,
            metadata: payout,
          },
        ],
      })),
    );

    console.log({ auditLogResponse });

    const invoice = payouts[0].invoice;
    const internalPayouts = payouts.filter(
      (payout) => payout.mode === "internal",
    );
    if (
      invoice &&
      invoice.paymentMethod !== "card" &&
      internalPayouts.length > 0
    ) {
      const batchEmailResponse = await sendBatchEmail(
        internalPayouts.map((payout) => ({
          to: payout.partner.email!,
          subject: `Your ${currencyFormatter(payout.amount)} payout for ${payout.program.name} is on the way`,
          variant: "notifications",
          replyTo: payout.program.supportEmail || "noreply",
          react: PartnerPayoutConfirmed({
            email: payout.partner.email!,
            program: {
              id: payout.program.id,
              name: payout.program.name,
              logo: payout.program.logo,
            },
            payout: {
              id: payout.id,
              amount: payout.amount,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
              mode: payout.mode,
              paymentMethod: invoice.paymentMethod ?? "ach",
            },
          }),
        })),
      );
      console.log({ batchEmailResponse });
    }

    if (payouts.length === BATCH_SIZE) {
      const nextStartingAfter = payouts[payouts.length - 1].id;

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/process/updates`,
        method: "POST",
        body: {
          invoiceId,
          startingAfter: nextStartingAfter,
        },
      });

      return logAndRespond(
        `Enqueued next batch for invoice ${invoiceId} (startingAfter: ${nextStartingAfter}).`,
      );
    }

    return logAndRespond(
      `Finished processing updates for ${payouts.length} payouts for invoice ${invoiceId}`,
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

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
  const startTime = performance.now();
  const timings: Record<string, number> = {};

  try {
    const rawBody = await req.text();

    const t0 = performance.now();
    await verifyQstashSignature({
      req,
      rawBody,
    });
    timings.qstashVerification = performance.now() - t0;

    const { invoiceId, startingAfter } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const t1 = performance.now();
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
    timings.prismaQuery = performance.now() - t1;

    if (payouts.length === 0) {
      return logAndRespond(
        `No more payouts to process for invoice ${invoiceId}. Skipping...`,
      );
    }

    const t2 = performance.now();
    const auditLogResponse = await recordAuditLog(
      payouts.map((p) => {
        const { program, partner, invoice, ...payout } = p;
        return {
          workspaceId: program.workspaceId,
          programId: program.id,
          action: "payout.confirmed",
          description: `Payout ${payout.id} confirmed`,
          actor: {
            id: payout.userId ?? "system",
          },
          targets: [
            {
              type: "payout",
              id: payout.id,
              metadata: payout,
            },
          ],
        };
      }),
    );
    timings.auditLog = performance.now() - t2;
    console.log(JSON.stringify({ auditLogResponse }, null, 2));

    const invoice = payouts[0].invoice;
    const internalPayouts = payouts.filter(
      (payout) => payout.mode === "internal",
    );
    if (
      invoice &&
      invoice.paymentMethod !== "card" &&
      internalPayouts.length > 0
    ) {
      const t3 = performance.now();
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
              initiatedAt: payout.initiatedAt,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
              mode: payout.mode,
              paymentMethod: invoice.paymentMethod ?? "ach",
            },
          }),
        })),
      );
      timings.resendBatchApi = performance.now() - t3;
      console.log(JSON.stringify({ batchEmailResponse }, null, 2));
    }

    console.log(
      JSON.stringify(
        {
          timings: {
            totalMs: Math.round((performance.now() - startTime) * 100) / 100,
            qstashVerificationMs:
              Math.round(timings.qstashVerification * 100) / 100,
            auditLogMs: Math.round(timings.auditLog * 100) / 100,
            resendBatchApiMs: timings.resendBatchApi
              ? Math.round(timings.resendBatchApi * 100) / 100
              : null,
          },
        },
        null,
        2,
      ),
    );

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

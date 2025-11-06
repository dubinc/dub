import { qstash } from "@/lib/cron";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import type PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function processExternalPayouts({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const externalPayouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      status: "processing",
      mode: "external",
    },
    include: {
      partner: true,
      program: true,
      invoice: true,
    },
  });

  // Send "payout.confirmed" webhooks
  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-webhooks`,
    body: {
      invoiceId,
    },
    deduplicationId: `payout-confirmed-webhooks-${invoiceId}`,
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payout.updateMany({
      where: {
        id: {
          in: externalPayouts.map((p) => p.id),
        },
      },
      data: {
        status: "completed",
        paidAt: new Date(),
      },
    });

    await tx.commission.updateMany({
      where: {
        payoutId: {
          in: externalPayouts.map((p) => p.id),
        },
      },
      data: {
        status: "paid",
      },
    });
  });

  await queueBatchEmail<typeof PartnerPayoutConfirmed>(
    externalPayouts
      .filter((payout) => payout.partner.email)
      .map((payout) => ({
        to: payout.partner.email!,
        subject: "You've got money coming your way!",
        variant: "notifications",
        replyTo: payout.program.supportEmail || "noreply",
        templateName: "PartnerPayoutConfirmed",
        templateProps: {
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
            mode: "external",
            paymentMethod: payout.invoice?.paymentMethod ?? "ach",
          },
        },
      })),
    {
      idempotencyKey: `payout-confirmed-external/${invoiceId}`,
    },
  );
}

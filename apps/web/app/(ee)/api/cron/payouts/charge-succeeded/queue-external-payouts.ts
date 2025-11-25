import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { payoutWebhookEventSchema } from "@/lib/zod/schemas/payouts";
import type PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";

export async function queueExternalPayouts(
  invoice: Pick<
    Invoice,
    "id" | "paymentMethod" | "programId" | "workspaceId" | "payoutMode"
  >,
) {
  // All payouts are processed internally, hence no need to queue external payouts
  if (invoice.payoutMode === "internal") {
    console.log(`Invoice ${invoice.id} is paid internally. Skipping...`);
    return;
  }

  // should never happen, but just in case
  if (!invoice.programId) {
    console.log(`Invoice ${invoice.id} has no program ID. Skipping...`);
    return;
  }

  const program = await prisma.program.findUnique({
    where: {
      id: invoice.programId,
    },
    select: {
      id: true,
      name: true,
      logo: true,
      supportEmail: true,
    },
  });

  // should never happen, but just in case
  if (!program) {
    console.log(`Program not found for invoice ${invoice.id}. Skipping...`);
    return;
  }

  const externalPayouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
      status: "processing",
      mode: "external",
    },
    include: {
      partner: {
        include: {
          programs: {
            where: {
              programId: program.id,
            },
            select: {
              tenantId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (externalPayouts.length === 0) {
    console.log("No external payouts found for invoice", invoice.id);
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: invoice.workspaceId,
      disabledAt: null,
      triggers: {
        array_contains: ["payout.confirmed"],
      },
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  if (webhooks.length === 0) {
    console.log(
      `No webhooks found for workspace ${invoice.workspaceId} for invoice ${invoice.id}. Skipping...`,
    );
    return;
  }

  for (const payout of externalPayouts) {
    try {
      const data = payoutWebhookEventSchema.parse({
        ...payout,
        partner: {
          ...payout.partner,
          ...payout.partner.programs[0],
        },
      });

      await sendWorkspaceWebhook({
        workspace: {
          id: invoice.workspaceId,
          webhookEnabled: true,
        },
        webhooks,
        data,
        trigger: "payout.confirmed",
      });
    } catch (error) {
      console.error(error.message);
    }
  }

  await queueBatchEmail<typeof PartnerPayoutConfirmed>(
    externalPayouts.map((payout) => ({
      to: payout.partner.email!,
      subject: `Your ${currencyFormatter(payout.amount)} payout for ${program.name} is on the way`,
      variant: "notifications",
      replyTo: program.supportEmail || "noreply",
      templateName: "PartnerPayoutConfirmed",
      templateProps: {
        email: payout.partner.email!,
        program: {
          id: program.id,
          name: program.name,
          logo: program.logo,
        },
        payout: {
          id: payout.id,
          amount: payout.amount,
          initiatedAt: payout.initiatedAt,
          startDate: payout.periodStart,
          endDate: payout.periodEnd,
          mode: "external",
          paymentMethod: invoice.paymentMethod ?? "ach",
        },
      },
    })),
    {
      idempotencyKey: `payout-confirmed-external/${invoice.id}`,
    },
  );
}

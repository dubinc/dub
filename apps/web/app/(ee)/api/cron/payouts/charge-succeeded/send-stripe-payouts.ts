import { QStashWorkflow, triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";

export async function sendStripePayouts({
  invoiceId,
  chargeId,
}: {
  invoiceId: string;
  chargeId?: string;
}) {
  const commonInclude = Prisma.validator<Prisma.PayoutInclude>()({
    partner: {
      select: {
        id: true,
        email: true,
        stripeConnectId: true,
      },
    },
    program: {
      select: {
        id: true,
        name: true,
        logo: true,
      },
    },
  });

  const currentInvoicePayouts = await prisma.payout.findMany({
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
    include: commonInclude,
    take: 100,
  });

  if (currentInvoicePayouts.length === 0) {
    console.log("No payouts to be sent via Stripe, skipping...");
    return;
  }

  // get all previously processed payouts for the partners in this invoice
  // but haven't been transferred to their Stripe Express account yet
  const previouslyProcessedPayouts = await prisma.payout.findMany({
    where: {
      status: "processed",
      stripeTransferId: null,
      partnerId: {
        in: currentInvoicePayouts.map((p) => p.partnerId),
      },
    },
    include: commonInclude,
  });

  // Group currentInvoicePayouts + previouslyProcessedPayouts by partnerId
  const partnerPayoutsMap = [
    ...currentInvoicePayouts,
    ...previouslyProcessedPayouts,
  ].reduce((map, payout) => {
    const { partner } = payout;

    if (!map.has(partner.id)) {
      map.set(partner.id, []);
    }

    map.get(partner.id)!.push(payout);

    return map;
  }, new Map<string, typeof currentInvoicePayouts>());

  // Create a workflow for each transfer
  const workflows: QStashWorkflow<"create-stripe-transfer">[] = [];

  for (const [partnerId, partnerPayouts] of partnerPayoutsMap) {
    workflows.push({
      workflowId: "create-stripe-transfer",
      body: {
        partnerId,
        chargeId,
        previouslyProcessedPayouts: partnerPayouts.filter(
          (p) => p.status === "processed",
        ),
        // this is usually just one payout, but we're doing this
        // just in case there are multiple payouts for the same partner in the same invoice
        currentInvoicePayouts: partnerPayouts.filter(
          (p) => p.invoiceId === invoiceId,
        ),
      },
    });
  }

  await triggerWorkflows(workflows);
}

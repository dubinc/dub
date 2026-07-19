import { finalizePremiumDomainRegistration } from "@/lib/api/domains/finalize-premium-domain-registration";
import {
  isDomainRegistrationInvoice,
  parseRegisteredDomainSlugs,
} from "@/lib/api/domains/is-domain-registration-invoice";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Invoice } from "@prisma/client";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.ChargeSucceededEvent) {
  const charge = event.data.object;

  const { transfer_group: invoiceId } = charge;

  if (!invoiceId) {
    // check if the customer's workspace has paymentFailedAt, if so, reset it to null
    const stripeId = charge.customer as string;
    if (stripeId) {
      const workspace = await prisma.project.findUnique({
        where: {
          stripeId,
        },
      });
      if (workspace?.paymentFailedAt) {
        console.log("Workspace has paymentFailedAt, resetting it to null...");
        await prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            paymentFailedAt: null,
          },
        });
      }
    }
    return "No transfer_group (invoiceId) found, skipping invoice update flow...";
  }

  let invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (!invoice) {
    return `Invoice with transfer group ${invoiceId} not found.`;
  }

  if (invoice.status === "completed") {
    return `Invoice ${invoice.id} already completed, skipping...`;
  }

  invoice = await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      receiptUrl: charge.receipt_url,
      status: "completed",
      paidAt: new Date(),
      stripeChargeMetadata: JSON.parse(JSON.stringify(charge)),
    },
  });

  if (invoice.type === "partnerPayout") {
    return await processPayoutInvoice({ invoice });
  } else if (invoice.type === "domainRenewal") {
    return await processDomainRenewalInvoice({ invoice });
  }

  return `Unsupported invoice type (${invoice.type}), skipping...`;
}

async function processPayoutInvoice({ invoice }: { invoice: Invoice }) {
  const payoutsToProcess = await prisma.payout.count({
    where: {
      invoiceId: invoice.id,
      status: {
        not: "completed",
      },
    },
  });

  if (payoutsToProcess === 0) {
    return `No payouts to process found for invoice ${invoice.id}, skipping...`;
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
    flowControl: {
      key: invoice.id,
      rate: 1,
    },
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    return `Message sent to Qstash with id ${qstashResponse.messageId}`;
  } else {
    return `Error sending message to Qstash: ${JSON.stringify(qstashResponse)}`;
  }
}

async function processDomainRenewalInvoice({ invoice }: { invoice: Invoice }) {
  const slugs = parseRegisteredDomainSlugs(invoice.registeredDomains);

  if (
    await isDomainRegistrationInvoice({
      slugs,
      workspaceId: invoice.workspaceId,
    })
  ) {
    return await finalizePremiumDomainRegistration({
      domain: slugs[0],
      workspaceId: invoice.workspaceId,
    });
  }

  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: slugs,
      },
    },
    orderBy: {
      expiresAt: "asc",
    },
  });

  if (domains.length === 0) {
    return `No domains found for invoice ${invoice.id}, skipping...`;
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/renewal-succeeded`,
    deduplicationId: `domain-renewal-${invoice.id}`,
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    return `Message sent to Qstash with id ${qstashResponse.messageId}`;
  } else {
    return `Error sending message to Qstash: ${JSON.stringify(qstashResponse)}`;
  }
}

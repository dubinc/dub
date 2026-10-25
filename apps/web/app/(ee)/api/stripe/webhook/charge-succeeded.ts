import { finalizePremiumDomainRegistration } from "@/lib/api/domains/finalize-premium-domain-registration";
import {
  isDomainRegistrationInvoice,
  parseRegisteredDomainSlugs,
} from "@/lib/api/domains/is-domain-registration-invoice";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { prisma } from "@/lib/prisma";
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

  if (invoice.type === "domainRenewal") {
    return await processDomainRenewalInvoice({ invoice });
  }

  return `Unsupported invoice type (${invoice.type}), skipping...`;
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

  const { results } = await dispatchWorkflows({
    name: "renew-domains-workflow",
    payload: {
      invoiceId: invoice.id,
    },
    options: {
      deduplicationId: `domain-renewal-${invoice.id}`,
      label: invoice.id,
    },
  });

  const [result] = results;

  if (result?.status === "published") {
    return `Renew domains workflow triggered for invoice ${invoice.id}`;
  } else {
    return `Error triggering renew domains workflow for invoice ${invoice.id}: ${result?.lastError}`;
  }
}

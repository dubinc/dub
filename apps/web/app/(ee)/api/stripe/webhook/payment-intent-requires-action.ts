import { prisma } from "@dub/prisma";
import Stripe from "stripe";
import { processDomainRenewalFailure } from "./utils/process-domain-renewal-failure";
import { processPayoutInvoiceFailure } from "./utils/process-payout-invoice-failure";

export async function paymentIntentRequiresAction(event: Stripe.Event) {
  const { transfer_group: invoiceId, latest_charge: charge } = event.data
    .object as Stripe.PaymentIntent;

  if (!invoiceId) {
    return "No transfer group found, skipping...";
  }

  let invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (!invoice) {
    return `Invoice with transfer group ${invoiceId} not found.`;
  }

  invoice = await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: "failed",
      failedReason:
        "Your payment requires additional authentication to complete.",
      failedAttempts: {
        increment: 1,
      },
    },
  });

  if (invoice.type === "partnerPayout") {
    await processPayoutInvoiceFailure({ invoice });
    return `Processed partner payout failure for invoice ${invoice.id}.`;
  } else if (invoice.type === "domainRenewal") {
    await processDomainRenewalFailure({ invoice });
    return `Processed domain renewal failure for invoice ${invoice.id}.`;
  }

  return `Unsupported invoice type (${invoice.type}), skipping...`;
}

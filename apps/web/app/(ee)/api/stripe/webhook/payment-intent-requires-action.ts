import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { processDomainRenewalFailure } from "./utils/process-domain-renewal-failure";

export async function paymentIntentRequiresAction(
  event: Stripe.PaymentIntentRequiresActionEvent,
) {
  const { transfer_group: invoiceId } = event.data.object;

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

  if (invoice.type === "domainRenewal") {
    await processDomainRenewalFailure({ invoice });
    return `Processed domain renewal failure for invoice ${invoice.id}.`;
  }

  return `Unsupported invoice type (${invoice.type}), skipping...`;
}

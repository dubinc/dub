import { prisma } from "@dub/prisma";
import Stripe from "stripe";
import { processDomainRenewalFailure } from "./utils/process-domain-renewal-failure";
import { processPayoutInvoiceFailure } from "./utils/process-payout-invoice-failure";

export async function paymentIntentRequiresAction(event: Stripe.Event) {
  const { transfer_group: invoiceId, latest_charge: charge } = event.data
    .object as Stripe.PaymentIntent;

  if (!invoiceId) {
    console.log("No transfer group found, skipping...");
    return;
  }

  let invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (!invoice) {
    console.log(`Invoice with transfer group ${invoiceId} not found.`);
    return;
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
    return await processPayoutInvoiceFailure({ invoice });
  } else if (invoice.type === "domainRenewal") {
    return await processDomainRenewalFailure({ invoice });
  }
}

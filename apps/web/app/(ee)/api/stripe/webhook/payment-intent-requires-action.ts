import { prisma } from "@dub/prisma";
import Stripe from "stripe";
import { processDomainRenewalFailure } from "./utils/process-domain-renewal-failure";

export async function paymentIntentRequiresAction(event: Stripe.Event) {
  const { transfer_group: invoiceId } = event.data
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

  if (invoice.type !== "domainRenewal") {
    console.log(
      `Invoice with transfer group ${invoiceId} is not a domain renewal.`,
    );
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

  return await processDomainRenewalFailure({ invoice });
}

import { prisma } from "@dub/prisma";
import Stripe from "stripe";
import { processDomainRenewalFailure } from "./utils/process-domain-renewal-failure";
import { processPayoutInvoiceFailure } from "./utils/process-payout-invoice-failure";

export async function chargeFailed(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId, failure_message: failedReason } = charge;

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
      failedReason,
      failedAttempts: {
        increment: 1,
      },
    },
  });

  if (invoice.type === "partnerPayout") {
    await processPayoutInvoiceFailure({ invoice, charge });
  } else if (invoice.type === "domainRenewal") {
    await processDomainRenewalFailure({ invoice });
  }
}

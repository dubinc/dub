import { prisma } from "@dub/prisma";
import Stripe from "stripe";
import { processDomainRenewalInvoice } from "./utils/process-domain-renewal-invoice";
import { processPayoutInvoice } from "./utils/process-payout-invoice";

export async function chargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId } = charge;

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

  if (invoice.status === "completed") {
    console.log(`Invoice ${invoice.id} already completed, skipping...`);
    return;
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
    await processPayoutInvoice({ invoice });
  } else if (invoice.type === "domainRenewal") {
    await processDomainRenewalInvoice({ invoice });
  }
}

import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { detectAndHandleFraudulentFailedCharge } from "./utils/detect-and-handle-fraudulent-failed-charge";
import { processDomainRenewalFailure } from "./utils/process-domain-renewal-failure";

export async function chargeFailed(event: Stripe.ChargeFailedEvent) {
  const charge = event.data.object;

  const { transfer_group: invoiceId, failure_message: failedReason } = charge;

  if (!invoiceId) {
    return detectAndHandleFraudulentFailedCharge(event);
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
      failedReason,
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

import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import Stripe from "stripe";

export async function chargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId } = charge;

  if (!invoiceId) {
    return "No transfer group found, skipping...";
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (!invoice) {
    return `Invoice with transfer group ${invoiceId} not found.`;
  }

  if (invoice.type !== "domainRenewal") {
    return `Invoice ${invoice.id} is not a 'domainRenewal' type, skipping...`;
  }

  await processDomainRenewalInvoice({ invoice });
  return `Disabled auto-renew for domains on invoice ${invoice.id}.`;
}

async function processDomainRenewalInvoice({ invoice }: { invoice: Invoice }) {
  const domains = invoice.registeredDomains as string[];

  await Promise.allSettled(
    domains.map((domain) =>
      setRenewOption({
        domain,
        autoRenew: false,
      }),
    ),
  );
}

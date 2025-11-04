import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import Stripe from "stripe";

export async function chargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId } = charge;

  if (!invoiceId) {
    console.log("No transfer group found, skipping...");
    return;
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (!invoice) {
    console.log(`Invoice with transfer group ${invoiceId} not found.`);
    return;
  }

  if (invoice.type !== "domainRenewal") {
    console.log(`Invoice ${invoice.id} is not a 'domainRenewal' type.`);
    return;
  }

  await processDomainRenewalInvoice({ invoice });
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

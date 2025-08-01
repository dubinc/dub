import { qstash } from "@/lib/cron";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { addDays } from "date-fns";
import Stripe from "stripe";

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
    await processRenewalInvoice({ invoice });
  }
}

async function processPayoutInvoice({ invoice }: { invoice: Invoice }) {
  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
      status: {
        not: "completed",
      },
    },
    include: {
      program: true,
      partner: true,
    },
  });

  if (payouts.length === 0) {
    console.log(
      `No payouts found with status not completed for invoice ${invoice.id}, skipping...`,
    );
    return;
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }
}

async function processRenewalInvoice({ invoice }: { invoice: Invoice }) {
  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: invoice.registeredDomains as string[],
      },
    },
  });

  if (domains.length === 0) {
    console.log(`No domains found for invoice ${invoice.id}, skipping...`);
    return;
  }

  await prisma.registeredDomain.updateMany({
    where: {
      id: {
        in: domains.map(({ id }) => id),
      },
    },
    data: {
      expiresAt: addDays(new Date(), 365),
      autoRenewalDisabledAt: null,
    },
  });

  await Promise.allSettled(
    domains.map((domain) =>
      setRenewOption({
        domain: domain.slug,
        autoRenew: true,
      }),
    ),
  );

  // TODO:
  // Send email to the user
}

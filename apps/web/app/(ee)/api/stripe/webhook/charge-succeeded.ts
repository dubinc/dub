import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.Event) {
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
    select: {
      id: true,
      status: true,
      type: true,
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

  if (invoice.type === "partnerPayout") {
    await processPayoutInvoice({ invoice, charge });
  } else if (invoice.type === "domainRenewal") {
    await processRenewalInvoice({ invoice, charge });
  }
}

async function processPayoutInvoice({
  invoice,
  charge,
}: {
  invoice: Pick<Invoice, "id">;
  charge: Stripe.Charge;
}) {
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

  await prisma.invoice.update({
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

async function processRenewalInvoice({
  invoice,
  charge,
}: {
  invoice: Pick<Invoice, "id">;
  charge: Stripe.Charge;
}) {
  // TODO:
  // Find all domains associated with the invoice
  // Update the domains with the new expiration date
  // set domain's renew_option to "auto" on Dynadot
  // Send email to the user
}

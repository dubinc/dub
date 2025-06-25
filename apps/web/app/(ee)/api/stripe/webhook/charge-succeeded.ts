import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { id: chargeId, receipt_url, transfer_group, payment_intent } = charge;

  if (!transfer_group) {
    console.log("No transfer group found, skipping...");
    return;
  }

  console.log({ chargeId, receipt_url, transfer_group });

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: transfer_group,
    },
    include: {
      payouts: {
        where: {
          status: {
            not: "completed",
          },
        },
        include: {
          program: true,
          partner: true,
        },
      },
    },
  });

  if (!invoice) {
    console.log(`Invoice with transfer group ${transfer_group} not found.`);
    return;
  }

  if (invoice.status === "completed") {
    console.log("Invoice already completed, skipping...");
    return;
  }

  if (invoice.payouts.length === 0) {
    console.log("No payouts found with status not completed, skipping...");
    return;
  }

  await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      receiptUrl: receipt_url,
      status: "completed",
      paidAt: new Date(),
      stripeChargeMetadata: JSON.parse(JSON.stringify(charge)),
    },
  });

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
    body: {
      chargeId,
      invoiceId: invoice.id,
      achCreditTransfer: Boolean(
        charge.payment_method_details?.ach_credit_transfer,
      ),
    },
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }
}

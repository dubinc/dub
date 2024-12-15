import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { id: chargeId, payment_intent: paymentIntentId } = charge;

  if (typeof paymentIntentId !== "string") {
    throw new Error("Invalid payment intent ID.");
  }

  console.log({ chargeId, paymentIntentId });

  const invoice = await prisma.invoice.findUnique({
    where: {
      paymentIntentId,
    },
    include: {
      payouts: {
        include: {
          partner: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(
      `Invoice with payment intent ${paymentIntentId} not found.`,
    );
  }

  console.log("Invoice found", invoice);

  for (const payout of invoice.payouts) {
    const transfer = await stripe.transfers.create({
      amount: payout.amount,
      currency: "usd",
      destination: payout.partner.stripeConnectId!,
      source_transaction: chargeId,
      transfer_group: invoice.id,
      description: "Dub Partners Payout",
    });

    console.log("Transfer created", transfer);

    await prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          stripeTransferId: transfer.id,
          status: "completed",
        },
      });

      await tx.sale.updateMany({
        where: {
          payoutId: payout.id,
        },
        data: {
          status: "paid",
        },
      });
    });
  }
}

import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { id: chargeId, transfer_group } = charge;

  if (!transfer_group) {
    console.log("No transfer group found, skipping...");
    return;
  }

  console.log({ chargeId, transfer_group });

  const invoice = await prisma.invoice.update({
    where: {
      id: transfer_group,
    },
    data: {
      status: "completed",
    },
    include: {
      payouts: {
        include: {
          partner: true,
          program: true,
        },
      },
    },
  });

  if (!invoice) {
    console.log(`Invoice with transfer group ${transfer_group} not found.`);
    return;
  }

  for (const payout of invoice.payouts) {
    const transfer = await stripe.transfers.create({
      amount: payout.amount,
      currency: "usd",
      destination: payout.partner.stripeConnectId!,
      transfer_group: invoice.id,
      description: `Dub Partners payout (${payout.program.name})`,
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

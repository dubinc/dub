import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "charge.refunded"
export async function chargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const stripeAccountId = event.account as string;

  if (!charge.invoice) {
    return `Charge ${charge.id} has no invoice, skipping...`;
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      programs: true,
    },
  });

  if (!workspace) {
    return `Workspace not found for stripe account ${stripeAccountId}`;
  }

  if (!workspace.programs.length) {
    return `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs, skipping...`;
  }

  const commission = await prisma.commission.findUnique({
    where: {
      programId_invoiceId: {
        programId: workspace.programs[0].id,
        invoiceId: charge.invoice as string,
      },
    },
    select: {
      id: true,
      status: true,
      payoutId: true,
      earnings: true,
    },
  });

  if (!commission) {
    return `Commission not found for invoice ${charge.invoice}`;
  }

  if (commission.status === "paid") {
    return `Commission ${commission.id} is already paid, skipping...`;
  }

  // if the commission is processed and has a payout, we need to update the payout total
  if (commission.status === "processed" && commission.payoutId) {
    const payout = await prisma.payout.findUnique({
      where: {
        id: commission.payoutId,
      },
    });

    if (payout) {
      await prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          amount: payout.amount - commission.earnings,
        },
      });
    }
  }

  // update the commission status to refunded
  await prisma.commission.update({
    where: {
      id: commission.id,
    },
    data: {
      status: "refunded",
      payoutId: null,
    },
  });

  return `Commission ${commission.id} updated to status "refunded"`;
}

import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { stripeAppClient } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "charge.refunded"
export async function chargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const stripeAccountId = event.account as string;

  const stripe = stripeAppClient({
    livemode: event.livemode,
  });

  // Charge doesn't have invoice property, so we need to get the invoice from the payment intent
  const invoicePayments = await stripe.invoicePayments.list(
    {
      payment: {
        payment_intent: charge.payment_intent as string,
        type: "payment_intent",
      },
    },
    {
      stripeAccount: stripeAccountId,
    },
  );

  const invoicePayment =
    invoicePayments.data.length > 0 ? invoicePayments.data[0] : null;

  if (!invoicePayment || !invoicePayment.invoice) {
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
      invoiceId_programId: {
        invoiceId: invoicePayment.invoice as string,
        programId: workspace.programs[0].id,
      },
    },
    select: {
      id: true,
      status: true,
      payoutId: true,
      earnings: true,
      partnerId: true,
      programId: true,
    },
  });

  if (!commission) {
    return `Commission not found for invoice ${invoicePayment.invoice}`;
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

  // sync total commissions for the partner in the program
  await syncTotalCommissions({
    partnerId: commission.partnerId,
    programId: commission.programId,
  });

  return `Commission ${commission.id} updated to status "refunded"`;
}

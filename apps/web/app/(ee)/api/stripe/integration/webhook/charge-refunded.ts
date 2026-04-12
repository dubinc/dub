import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { stripeWebhookResult } from "./stripe-webhook-handler-result";

// Handle event "charge.refunded"
export async function chargeRefunded(event: Stripe.Event, mode: StripeMode) {
  const charge = event.data.object as Stripe.Charge;
  const stripeAccountId = event.account as string;

  const stripe = stripeAppClient({
    mode,
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
    return {
      response: `Charge ${charge.id} has no invoice, skipping...`,
    };
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
    return {
      response: `Workspace not found for Stripe account ${stripeAccountId}, skipping...`,
    };
  }

  const workspaceId = workspace.id;

  if (!workspace.programs.length) {
    return {
      response: `Workspace ${workspaceId} for stripe account ${stripeAccountId} has no programs, skipping...`,
      workspaceId,
    };
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
      amount: true,
      earnings: true,
      status: true,
      payoutId: true,
      partnerId: true,
      programId: true,
    },
  });

  if (!commission) {
    return {
      response: `Commission not found for invoice ${invoicePayment.invoice}`,
      workspaceId,
    };
  }

  if (commission.status === "paid") {
    return {
      response: `Commission ${commission.id} is already paid, skipping...`,
      workspaceId,
    };
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

  await trackCommissionStatusUpdate({
    workspaceId: workspace.id,
    programId: commission.programId,
    commissions: [commission],
    newStatus: "refunded",
  });

  return stripeWebhookResult(
    `Commission ${commission.id} updated to status "refunded"`,
    workspaceId,
  );
}

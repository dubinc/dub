import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { prisma } from "@/lib/prisma";
import { stripeAppClient } from "@/lib/stripe";
import type Stripe from "stripe";
import { StripeWebhookInput, StripeWebhookOutput } from "./utils/types";

// Handle event "charge.refunded"
export async function chargeRefunded({
  event,
  mode,
  workspace,
}: StripeWebhookInput & {
  event: Stripe.ChargeRefundedEvent;
}): Promise<StripeWebhookOutput> {
  const charge = event.data.object;
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

  if (!workspace.defaultProgramId) {
    return {
      response: `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no default program, skipping...`,
    };
  }

  const commission = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: invoicePayment.invoice as string,
        programId: workspace.defaultProgramId,
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
    };
  }

  if (commission.status === "paid") {
    return {
      response: `Commission ${commission.id} is already paid, skipping...`,
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

  return {
    response: `Commission ${commission.id} updated to status "refunded"`,
  };
}

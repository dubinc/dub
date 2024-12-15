import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";

// TODO:
// Check current invoiceId is processing (Maybe store it in Redis)
// Deduct the app fee from the invoice amount
// Should we combine the multiple payouts for same partner?
// Store the reason of failure in the payout table itself (internal purpose)?
// We probably need to keep a status column

export const processInvoice = async ({ invoiceId }: { invoiceId: string }) => {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      paymentMethodId: true,
      total: true,
      program: {
        select: {
          workspace: {
            select: {
              id: true,
              stripeId: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found.`);
  }

  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      status: "pending",
    },
    select: {
      id: true,
      amount: true,
      partner: {
        select: {
          id: true,
          email: true,
          stripeConnectId: true,
        },
      },
    },
  });

  if (payouts.length === 0) {
    throw new Error(`No payouts found for invoice ${invoiceId}.`);
  }

  const { workspace } = invoice.program;

  if (!workspace.stripeId) {
    throw new Error(`Workspace ${workspace.id} does not have a Stripe ID.`);
  }

  try {
    const { status, latest_charge } = await stripe.paymentIntents.create({
      amount: invoice.total,
      customer: workspace.stripeId,
      payment_method: invoice.paymentMethodId,
      currency: "usd",
      confirmation_method: "automatic",
      confirm: true,
      transfer_group: invoiceId,
      statement_descriptor: "Dub Partners",
      description: "Payout from Dub Partners",
    });

    // TODO:
    // Handle different statuses

    console.log("Payment intent created", { status, latest_charge });

    // Create transfers for each partners
    // TODO (Kiran): Need to optimize this when we have large number of payouts for an invoice.
    for (const payout of payouts) {
      const transfer = await stripe.transfers.create({
        amount: payout.amount,
        currency: "usd",
        destination: payout.partner.stripeConnectId!,
        source_transaction: latest_charge as string,
        transfer_group: invoiceId,
        description: "Stripe Payout",
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
  } catch (error) {
    throw new Error(
      `[Stripe Connect] Failed to create payment intent for invoice ${invoiceId}: ${error.message}`,
    );
  }
};

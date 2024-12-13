import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";

export const processInvoice = async ({ invoiceId }: { invoiceId: string }) => {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
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
  });

  if (payouts.length === 0) {
    throw new Error(`No payouts found for invoice ${invoiceId}.`);
  }

  const result = await stripe.paymentIntents.create({
    amount: payout.amount,
    currency: payout.currency,
    description: "Payout for affiliate from Dub Partners",
    customer: partner.stripeCustomerId, // Partner's Stripe Customer ID
    payment_method: "pm_1QV6ZKFacAXKeDpJQJa2tLc8", // Partner's Stripe Payment Method ID
    confirm: true,
    confirmation_method: "automatic",
    transfer_data: {
      destination: affiliate.connectedAccountId, // To where the payout is sent
    },
    application_fee_amount: 100, // 1% fee from Dub
  });

};

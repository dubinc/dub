import { stripe } from "@/lib/stripe";
import { currencyFormatter, log } from "@dub/utils";

export const createPaymentIntent = async ({
  stripeId,
  amount,
  invoiceId,
  description,
  statementDescriptor,
  idempotencyKey,
}: {
  stripeId: string;
  amount: number;
  invoiceId: string;
  description: string;
  statementDescriptor: string;
  idempotencyKey?: string;
}) => {
  const [cards, links] = await Promise.all([
    stripe.paymentMethods.list({
      customer: stripeId,
      type: "card",
    }),

    stripe.paymentMethods.list({
      customer: stripeId,
      type: "link",
    }),
  ]);

  if (cards.data.length === 0 && links.data.length === 0) {
    console.error(`No valid payment methods found for customer ${stripeId}.`);
    return { paymentIntent: null, paymentMethod: null };
  }

  const paymentMethod = cards.data[0] || links.data[0];

  if (!paymentMethod) {
    console.error(`No valid payment method found for customer ${stripeId}.`);
    return { paymentIntent: null, paymentMethod: null };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        customer: stripeId,
        transfer_group: invoiceId,
        payment_method_types: ["card", "link"],
        payment_method: paymentMethod.id,
        currency: "usd",
        confirmation_method: "automatic",
        confirm: true,
        statement_descriptor: statementDescriptor,
        description,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    console.log(
      `Payment intent ${paymentIntent.id} created for invoice ${invoiceId} with amount ${currencyFormatter(paymentIntent.amount / 100)}`,
    );

    return { paymentIntent, paymentMethod };
  } catch (error) {
    console.error(error);

    await log({
      message: `Failed to create payment intent for the invoice ${invoiceId}.`,
      type: "errors",
      mention: true,
    });

    return { paymentIntent: null, paymentMethod: null };
  }
};

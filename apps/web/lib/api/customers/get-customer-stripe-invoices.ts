import { stripeAppClient } from "@/lib/stripe";
import { StripeCustomerInvoiceSchema } from "@/lib/zod/schemas/customers";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

export async function getCustomerStripeInvoices({
  stripeCustomerId,
  stripeConnectId,
}: {
  stripeCustomerId: string;
  stripeConnectId: string;
}) {
  const { data } = await stripe.invoices.list(
    {
      customer: stripeCustomerId,
      status: "paid",
      limit: 100,
    },
    {
      stripeAccount: stripeConnectId,
    },
  );

  const stripeCustomerInvoices = data.map((invoice) =>
    StripeCustomerInvoiceSchema.parse({
      id: invoice.id,
      amount: invoice.amount_paid,
      createdAt: new Date(invoice.created * 1000),
      metadata: invoice,
    }),
  );

  return stripeCustomerInvoices;
}

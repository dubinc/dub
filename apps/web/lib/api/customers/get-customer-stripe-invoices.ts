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
    },
    {
      stripeAccount: stripeConnectId,
    },
  );

  const stripeCustomerInvoices =
    StripeCustomerInvoiceSchema.array().parse(data);

  return stripeCustomerInvoices;
}

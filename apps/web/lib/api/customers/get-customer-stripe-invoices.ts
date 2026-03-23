import { stripeAppClient } from "@/lib/stripe";
import { StripeCustomerInvoiceSchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

function hasStripeInvoiceRefund(
  invoice: Awaited<ReturnType<typeof stripe.invoices.list>>["data"][number],
) {
  const charge = (
    invoice as {
      charge?:
        | {
            refunded?: boolean;
            amount_refunded?: number;
          }
        | string
        | null;
    }
  ).charge;
  if (!charge || typeof charge === "string") {
    return false;
  }

  return !!charge.refunded || (charge.amount_refunded ?? 0) > 0;
}

export async function getCustomerStripeInvoices({
  stripeCustomerId,
  stripeConnectId,
  programId,
}: {
  stripeCustomerId: string;
  stripeConnectId: string;
  programId: string;
}) {
  const { data } = await stripe.invoices.list(
    {
      customer: stripeCustomerId,
      status: "paid",
      limit: 100,
      expand: ["data.charge"],
    },
    {
      stripeAccount: stripeConnectId,
    },
  );
  const validInvoices = data.filter(
    (invoice): invoice is (typeof data)[number] & { id: string } =>
      typeof invoice.id === "string" && !hasStripeInvoiceRefund(invoice),
  );

  const commissions = await prisma.commission.findMany({
    where: {
      invoiceId: {
        in: validInvoices.map((invoice) => invoice.id),
      },
      programId: programId,
    },
  });

  const invoiceIdCommissionIdMap = commissions.reduce(
    (acc, commission) => {
      acc[commission.invoiceId!] = commission.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  const stripeCustomerInvoices = validInvoices.map((invoice) =>
    StripeCustomerInvoiceSchema.parse({
      id: invoice.id,
      amount: invoice.amount_paid,
      createdAt: new Date(invoice.created * 1000),
      metadata: invoice,
      dubCommissionId: invoiceIdCommissionIdMap[invoice.id],
    }),
  );

  return stripeCustomerInvoices;
}

import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { stripeAppClient } from "@/lib/stripe";
import { StripeCustomerInvoiceSchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import Stripe from "stripe";

type ExpandedStripeInvoice = Stripe.Invoice & {
  id: string;
  payments?: {
    data?: Array<{
      payment?: {
        type?: "charge" | "payment_intent" | "payment_record";
        charge?: string | Stripe.Charge | null;
        payment_intent?: string | Stripe.PaymentIntent | null;
      };
    }>;
  };
};

export async function getCustomerStripeInvoices({
  stripeCustomerId,
  stripeConnectId,
  programId,
}: {
  stripeCustomerId: string;
  stripeConnectId: string;
  programId: string;
}) {
  const installedStripeIntegration =
    await prisma.installedIntegration.findFirst({
      where: {
        project: {
          stripeConnectId,
        },
        integrationId: STRIPE_INTEGRATION_ID,
      },
      select: {
        settings: true,
      },
    });

  if (!installedStripeIntegration) {
    throw new Error("Stripe integration is not installed on your workspace.");
  }

  const stripeIntegrationSettings = stripeIntegrationSettingsSchema.parse(
    installedStripeIntegration.settings,
  );

  const stripe = stripeAppClient({
    mode: stripeIntegrationSettings.stripeMode,
  });
  const { data } = await stripe.invoices.list(
    {
      customer: stripeCustomerId,
      status: "paid",
      limit: 100,
      expand: ["data.payments.data.payment"],
    },
    {
      stripeAccount: stripeConnectId,
    },
  );
  const invoices = data.filter(
    (invoice) => invoice.id,
  ) as ExpandedStripeInvoice[];

  let charges: Stripe.Charge[] = [];
  try {
    const res = await stripe.charges.list(
      {
        limit: 100,
        customer: stripeCustomerId,
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
    charges = res.data;
  } catch (error) {
    // Stripe integration might be outdated and don't have charges.read permission
    console.warn(error);
  }

  const commissions = await prisma.commission.findMany({
    where: {
      invoiceId: {
        in: invoices.map((invoice) => invoice.id),
      },
      programId: programId,
    },
  });

  const invoiceIdCommissionIdMap = commissions.reduce(
    (acc, commission) => {
      if (commission.invoiceId) {
        acc[commission.invoiceId] = commission.id;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const processInvoice = (invoice: ExpandedStripeInvoice) => {
    const { payments, ...rest } = invoice;
    if (!payments || !payments.data || !payments.data.length) {
      return {
        refunded: false,
        metadata: rest,
      };
    }

    for (const payment of payments.data) {
      if (
        payment.payment?.type === "payment_intent" &&
        payment.payment?.payment_intent
      ) {
        const charge = charges.find(
          (charge) => charge.payment_intent === payment.payment?.payment_intent,
        );
        if (charge?.refunded || (charge?.amount_refunded ?? 0) > 0) {
          return {
            refunded: true,
            metadata: rest,
          };
        }
      }
    }

    return {
      refunded: false,
      metadata: rest,
    };
  };

  const stripeCustomerInvoices = invoices.map((invoice) =>
    StripeCustomerInvoiceSchema.parse({
      id: invoice.id,
      amount: invoice.amount_paid,
      createdAt: new Date(invoice.created * 1000),
      refunded: processInvoice(invoice).refunded,
      dubCommissionId: invoiceIdCommissionIdMap[invoice.id],
      metadata: processInvoice(invoice).metadata,
    }),
  );

  return stripeCustomerInvoices;
}

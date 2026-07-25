import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { InvoiceSchema } from "@/lib/zod/schemas/invoices";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as z from "zod/v4";

const querySchema = z.object({
  type: z
    .enum(["subscription", "partnerPayout", "domainRenewal"])
    .optional()
    .default("subscription"),
  stripeStatus: z.enum(["open"]).optional(), // only for Stripe subscription invoices
});

// TODO: move to GET /invoices
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    if (!workspace.stripeId) {
      return NextResponse.json([]);
    }

    const { type, stripeStatus } = querySchema.parse(searchParams);

    const invoices =
      type === "subscription"
        ? await getSubscriptionInvoices(workspace.stripeId, {
            status: stripeStatus,
          })
        : await getOtherInvoices({
            workspaceId: workspace.id,
            type,
          });

    return NextResponse.json(z.array(InvoiceSchema).parse(invoices));
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);

const getSubscriptionInvoices = async (
  stripeId: string,
  { status }: { status?: "open" } = {},
) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: stripeId,
      limit: 100,
      ...(status && { status }),
    });

    return invoices.data.map((invoice) => mapSubscriptionInvoice(invoice));
  } catch (error) {
    console.log(error);
    return [];
  }
};

const mapSubscriptionInvoice = (invoice: Stripe.Invoice) => ({
  id: invoice.id,
  total: invoice.total ?? invoice.amount_due,
  stripeStatus: invoice.status,
  createdAt: new Date(invoice.created * 1000),
  description: "Dub subscription",
  pdfUrl: invoice.invoice_pdf,
});

const getOtherInvoices = async ({
  workspaceId,
  type,
}: {
  workspaceId: string;
  type: "partnerPayout" | "domainRenewal";
}) => {
  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId,
      type,
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      status: true,
      paymentMethod: true,
      failedReason: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invoices.map((invoice) => {
    return {
      ...invoice,
      description:
        type === "partnerPayout" ? "Dub Partner payout" : "Dub Domain renewal",
      pdfUrl: `${APP_DOMAIN}/invoices/${invoice.id}`,
    };
  });
};

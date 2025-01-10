import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { InvoiceSchema } from "@/lib/zod/schemas/invoices";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["subscription", "payout"]).optional().default("subscription"),
});

export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  if (!workspace.stripeId) {
    return NextResponse.json([]);
  }

  const { type } = querySchema.parse(searchParams);

  const invoices =
    type === "subscription"
      ? await subscriptionInvoices(workspace.stripeId)
      : await payoutInvoices(workspace.id);

  return NextResponse.json(z.array(InvoiceSchema).parse(invoices));
});

const subscriptionInvoices = async (stripeId: string) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: stripeId,
    });

    return invoices.data.map((invoice) => {
      return {
        id: invoice.id,
        total: invoice.amount_paid,
        createdAt: new Date(invoice.created * 1000),
        description: "Dub subscription",
        pdfUrl: invoice.invoice_pdf,
      };
    });
  } catch (error) {
    console.log(error);
    return [];
  }
};

const payoutInvoices = async (workspaceId: string) => {
  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      receiptUrl: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invoices.map((invoice) => {
    return {
      ...invoice,
      description: "Dub Partner payout",
      pdfUrl: `${APP_DOMAIN}/invoices/${invoice.id}`,
    };
  });
};

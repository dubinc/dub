import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { InvoiceSchema } from "@/lib/zod/schemas/invoices";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  type: z
    .enum(["subscription", "partnerPayout", "domainRenewal"])
    .optional()
    .default("subscription"),
});

// TODO: move to GET /invoices
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  if (!workspace.stripeId) {
    return NextResponse.json([]);
  }

  const { type } = querySchema.parse(searchParams);

  const invoices =
    type === "subscription"
      ? await subscriptionInvoices(workspace.stripeId)
      : await otherInvoices({
          workspaceId: workspace.id,
          type,
        });

  return NextResponse.json(z.array(InvoiceSchema).parse(invoices));
});

const subscriptionInvoices = async (stripeId: string) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: stripeId,
      limit: 100,
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

const otherInvoices = async ({
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

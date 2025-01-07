import { generateInvoicePrefix } from "@/lib/api/invoices/utils";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function paymentMethodAttached(event: Stripe.Event) {
  const { id, customer, type } = event.data.object as Stripe.PaymentMethod;

  if (type !== "us_bank_account") {
    return;
  }

  const workspace = await prisma.project.update({
    where: {
      stripeId: customer as string,
    },
    data: {
      payoutMethodId: id,
    },
    select: {
      id: true,
      invoicePrefix: true,
    },
  });

  // Generate invoice prefix if it doesn't exist
  if (!workspace.invoicePrefix) {
    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        invoicePrefix: await generateInvoicePrefix(),
      },
    });
  }
}

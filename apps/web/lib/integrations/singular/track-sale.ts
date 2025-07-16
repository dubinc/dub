import { trackSale } from "@/lib/api/conversions/track-sale";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { z } from "zod";

const singularRevenueEventSchema = z.object({
  event_name: z.string().min(1),
  revenue: z.number(),
  event_attributes: z
    .string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        throw new Error("Invalid JSON in event_attributes");
      }
    })
    .pipe(
      z.object({
        customer_external_id: trackSaleRequestSchema.shape.customerExternalId,
        amount: trackSaleRequestSchema.shape.amount,
        currency: trackSaleRequestSchema.shape.currency,
        payment_processor: trackSaleRequestSchema.shape.paymentProcessor,
        invoice_id: trackSaleRequestSchema.shape.invoiceId,
        lead_event_name: trackSaleRequestSchema.shape.leadEventName,
      }),
    ),
});

export const trackSingularSaleEvent = async (
  searchParams: Record<string, string>,
) => {
  console.log("[Singular] Revenue event received", searchParams);

  const {
    revenue,
    event_name: eventName,
    event_attributes: {
      customer_external_id: customerExternalId,
      amount,
      currency,
      payment_processor: paymentProcessor,
      invoice_id: invoiceId,
      lead_event_name: leadEventName,
    },
  } = singularRevenueEventSchema.parse(searchParams);

  // TODO: Fix this
  const workspaceId = "clrei1gld0002vs9mzn93p8ik";

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      webhookEnabled: true,
    },
  });

  return await trackSale({
    customerExternalId,
    amount,
    currency,
    eventName,
    paymentProcessor,
    invoiceId,
    leadEventName,
    workspace,
    rawBody: searchParams,
  });
};

import { trackSale } from "@/lib/api/conversions/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { z } from "zod";

// TODO:
// See if we can use {CONVERTED_REVENUE}

const singularRevenueEventSchema = z.object({
  event_name: z.string().min(1),
  revenue: z
    .string()
    .min(1)
    .transform((val) => Number(val)),
  currency: trackSaleRequestSchema.shape.currency,
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
        payment_processor: trackSaleRequestSchema.shape.paymentProcessor,
        invoice_id: trackSaleRequestSchema.shape.invoiceId,
        lead_event_name: trackSaleRequestSchema.shape.leadEventName,
      }),
    ),
});

export const trackSingularSaleEvent = async ({
  searchParams,
  workspace,
}: {
  searchParams: Record<string, string>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
}) => {
  const {
    event_name: eventName,
    revenue: amount,
    currency,
    event_attributes: {
      customer_external_id: customerExternalId,
      payment_processor: paymentProcessor,
      invoice_id: invoiceId,
      lead_event_name: leadEventName,
    },
  } = singularRevenueEventSchema.parse(searchParams);

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
    metadata: null,
  });
};

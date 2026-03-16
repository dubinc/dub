import { trackSale } from "@/lib/api/conversions/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import * as z from "zod/v4";

const appsFlyerSaleEventSchema = z.object({
  event_name: z.string().min(1),
  customer_external_id: trackSaleRequestSchema.shape.customerExternalId,
  amount: z
    .string()
    .min(1)
    .transform((val) => Number(val)),
  invoice_id: trackSaleRequestSchema.shape.invoiceId,
  currency: trackSaleRequestSchema.shape.currency,
});

export const trackAppsFlyerSaleEvent = async ({
  queryParams,
  workspace,
}: {
  queryParams: Record<string, string>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
}) => {
  const {
    event_name: eventName,
    customer_external_id: customerExternalId,
    amount,
    currency,
    invoice_id: invoiceId,
  } = appsFlyerSaleEventSchema.parse(queryParams);

  return await trackSale({
    customerExternalId,
    amount,
    currency,
    eventName,
    paymentProcessor: undefined,
    invoiceId,
    leadEventName: undefined,
    metadata: null,
    workspace,
    rawBody: queryParams,
  });
};

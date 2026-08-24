import { createManualCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import * as z from "zod/v4";

type CreateManualCommissionBody = z.infer<
  typeof createManualCommissionBodySchema
>;

export function createCommissionFingerprintPayload(
  body: CreateManualCommissionBody,
): Record<string, unknown> {
  if (body.type === "lead") {
    return {
      type: body.type,
      partnerId: body.partnerId,
      customerId: body.customerId ?? null,
      customer: body.customer ?? null,
      linkId: body.linkId ?? null,
      leadEventDate: body.leadEventDate ?? null,
      leadEventName: body.leadEventName ?? null,
    };
  }

  if (body.type === "sale") {
    return {
      type: body.type,
      partnerId: body.partnerId,
      customerId: body.customerId ?? null,
      customer: body.customer ?? null,
      linkId: body.linkId ?? null,
      importStripeInvoices: body.importStripeInvoices ?? false,
      saleAmount: body.saleAmount ?? null,
      saleEventDate: body.saleEventDate ?? null,
      invoiceId: body.invoiceId ?? null,
      productId: body.productId ?? null,
    };
  }

  return {
    type: body.type,
    partnerId: body.partnerId,
    amount: body.amount,
    date: body.date ?? null,
    description: body.description ?? null,
  };
}

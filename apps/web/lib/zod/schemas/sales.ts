import z from "@/lib/zod";
import { clickEventSchemaTB } from "./clicks";

export const trackSaleRequestSchema = z.object({
  customerId: z.string(),
  paymentProcessor: z.enum(["stripe", "shopify", "paddle"]),
  productId: z.string().nullable(),
  invoiceId: z.string(),
  amount: z.number().int().positive().default(0),
  currency: z.string().default("usd"),
  recurring: z.boolean().default(false),
  recurringInterval: z.enum(["month", "year"]).default("month"),
  recurringIntervalCount: z.number().int().positive().default(1),
  refunded: z.boolean().default(false),
  metadata: z.record(z.unknown()).nullish(),
});

export const saleEventSchemaTB = clickEventSchemaTB
  .omit({ timestamp: true })
  .and(
    z.object({
      event_id: z.string(),
      customer_id: z.string(),
      payment_processor: z.string(),
      product_id: z.string(),
      invoice_id: z.string(),
      amount: z.number(),
      currency: z.string(),
      recurring: z.number(),
      recurring_interval: z.string(),
      recurring_interval_count: z.number(),
      refunded: z.number(),
      metadata: z.string(),
    }),
  );

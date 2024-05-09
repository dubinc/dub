import z from "@/lib/zod";
import { clickEventSchemaTB } from "./clicks";

export const trackSaleRequestSchema = z.object({
  customerId: z.string(),
  paymentProcessor: z.enum(["stripe", "shopify", "paddle"]),
  productId: z.string(),
  amount: z.number().int().positive().default(0),
  currency: z.string().default("usd"),
  recurring: z.boolean().default(false),
  recurringInterval: z.enum(["month", "year"]).default("month"),
  recurringIntervalCount: z.number().int().positive().default(1),
  refunded: z.boolean().default(false),
  metadata: z
    .record(z.unknown())
    .nullish()
    .transform((val) => (val ? JSON.stringify(val) : "")),
});

export const saleEventSchemaTB = clickEventSchemaTB.omit({ url: true }).and(
  z.object({
    event_id: z.string(),
    customer_id: z.string(),
    payment_processor: z.enum(["stripe", "shopify", "paddle"]),
    product_id: z.string(),
    amount: z.number().int().positive().default(0),
    currency: z.string().default("usd"),
    recurring: z.boolean().default(false),
    recurring_interval: z.enum(["month", "year"]).default("month"),
    recurring_interval_count: z.number().int().positive().default(1),
    refunded: z.boolean().default(false),
    metadata: z.string().default(""),
  }),
);

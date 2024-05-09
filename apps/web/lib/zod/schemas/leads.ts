import z from "@/lib/zod";
import { clickEventSchemaTB } from "./clicks";

export const trackLeadRequestSchema = z.object({
  clickId: z.string({ required_error: "clickId is required" }),
  eventName: z
    .string({ required_error: "eventName is required" })
    .min(1)
    .max(50),
  metadata: z
    .record(z.unknown())
    .nullish()
    .transform((val) => (val ? JSON.stringify(val) : "")),
  customerId: z
    .string()
    .max(100)
    .describe(
      "This is the unique identifier for the customer in the client's app. This is used to track the customer's journey.",
    ),
  customerName: z
    .string()
    .max(100)
    .nullish()
    .describe(
      "This is the name of the customer in the client's app. This is used to track the customer's journey.",
    ),
  customerEmail: z
    .string()
    .email()
    .max(100)
    .nullish()
    .describe(
      "This is the email of the customer in the client's app. This is used to track the customer's journey.",
    ),
  customerAvatar: z
    .string()
    .max(100)
    .nullish()
    .describe(
      "This is the avatar of the customer in the client's app. This is used to track the customer's journey.",
    ),
});

export const leadEventSchemaTB = clickEventSchemaTB.omit({ url: true }).and(
  z.object({
    event_id: z.string(),
    event_name: z.string(),
    metadata: z.string(), // TODO: Fix the type
    customer_id: z.string(),
  }),
);

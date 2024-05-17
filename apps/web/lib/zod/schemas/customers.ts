import z from "@/lib/zod";

export const trackCustomerRequestSchema = z.object({
  customerId: z.string({ required_error: "customerId is required" }),
  customerName: z.string().nullish().default(null),
  customerEmail: z.string().email().nullish().default(null),
  customerAvatar: z.string().url().nullish().default(null),
});

export const trackCustomerResponseSchema = z.object({
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerAvatar: z.string().nullable(),
});

export const customersMetadataSchema = z.object({
  workspace_id: z.string(),
  customer_id: z.string(),
  name: z.string().default(""),
  email: z.string().default(""),
  avatar: z.string().default(""),
  deleted: z.number().default(0),
});

import z from "@/lib/zod";

export const trackCustomerRequestSchema = z.object({
  customerId: z.string({ required_error: "customerId is required" }),
  customerName: z.string().nullish().default(""),
  customerEmail: z.string().email().nullish().default(""),
  customerAvatar: z.string().url().nullish().default(""),
});

export const customersMetadataSchema = z.object({
  timestamp: z.string(),
  customer_id: z.string(),
  name: z.string().nullish().default(""),
  email: z.string().email().nullish().default(""),
  avatar: z.string().url().nullish().default(""),
  workspace_id: z.string(),
  deleted: z.boolean().default(false),
});

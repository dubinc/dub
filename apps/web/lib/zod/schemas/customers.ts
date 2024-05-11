import z from "@/lib/zod";

export const trackCustomerRequestSchema = z.object({
  customerId: z.string({ required_error: "customerId is required" }),
  customerName: z.string().nullish(),
  customerEmail: z.string().email().nullish(),
  customerAvatar: z.string().url().nullish(),
});

export const customersMetadataSchema = z.object({
  customer_id: z.string(),
  name: z.string().nullish().default(""),
  email: z.string().nullish().default(""),
  avatar: z.string().nullish().default(""),
  workspace_id: z.string(),
  deleted: z.boolean().default(false),
});

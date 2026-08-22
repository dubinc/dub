import { orderSchema } from "@/lib/integrations/shopify/schema";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  order: orderSchema,
  clickId: z.string().nullable(),
  workspaceId: z.string(),
});

// Process the Shopify order
export const processShopifyOrderJob = defineJob({
  name: "process-shopify-order-job",
  schema: inputSchema,
  async handle(input) {
    const { workspaceId, clickId, order } = input;
  },
});

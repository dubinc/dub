import { remapDiscountCode } from "@/lib/discounts/remap-discount-code";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  discountCodeId: z.string(),
});

// Remap a single discount code to the partner's current enrollment/link discount.
// Fan-out from sync/detach can queue thousands of jobs; flow control caps
// concurrent remaps (and provider deletes) so we don't stampede Stripe/Shopify.
export const remapDiscountCodeJob = defineJob({
  name: "remap-discount-code-job",
  schema: inputSchema,
  defaults: {
    flowControl: {
      key: "remap-discount-code",
      parallelism: 20,
    },
  },
  async handle(input) {
    await remapDiscountCode(input);
  },
});

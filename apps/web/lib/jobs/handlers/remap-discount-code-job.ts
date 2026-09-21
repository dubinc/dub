import { remapDiscountCode } from "@/lib/discounts/remap-discount-code";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  discountCodeId: z.string(),
});

// Remap a single discount code to the partner's current enrollment/link discount
export const remapDiscountCodeJob = defineJob({
  name: "remap-discount-code-job",
  schema: inputSchema,
  async handle(input) {
    await remapDiscountCode(input);
  },
});

import { hardDeleteDiscountCode } from "@/lib/discounts/delete-discount-code";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  discountCodeId: z.string(),
});

export const deleteDiscountCodeJob = defineJob({
  name: "delete-discount-code-job",
  schema: inputSchema,
  defaults: {
    flowControl: {
      key: "delete-discount-code",
      parallelism: 50,
    },
  },
  async handle({ discountCodeId }) {
    await hardDeleteDiscountCode({
      discountCodeId,
    });
  },
});

import { attachDiscount } from "@/lib/discounts/attach-discount";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  discountId: z.string(),
});

// Attach a newly created group-level discount to enrollments in the group
export const attachDiscountJob = defineJob({
  name: "attach-discount-job",
  schema: inputSchema,
  async handle({ discountId }) {
    const result = await attachDiscount({
      discountId,
    });

    if (result?.hasMore) {
      await attachDiscountJob.dispatch({ discountId }, { label: discountId });
    }
  },
});

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
    console.info(
      `delete-discount-code-job is not implemented yet (${discountCodeId}).`,
    );
  },
});

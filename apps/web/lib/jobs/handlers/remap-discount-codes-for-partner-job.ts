import { remapDiscountCodes } from "@/lib/discounts/remap-discount-codes-for-partner";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

export const remapDiscountCodesForPartnerJob = defineJob({
  name: "remap-discount-codes-for-partner-job",
  schema: inputSchema,
  async handle(input) {
    await remapDiscountCodes(input);
  },
});

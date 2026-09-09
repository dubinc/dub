import { createCustomRewardCommissions } from "@/lib/api/rewards/create-custom-reward-commissions";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  rewardId: z.string(),
  periodDate: z.iso.date(),
  startAfterPartnerId: z.string().optional(),
});

export const createCustomCommissionJob = defineJob({
  name: "create-custom-commission-job",
  schema: inputSchema,
  defaults: {
    retries: 3,
  },
  async handle(input) {
    const { nextCursor } = await createCustomRewardCommissions(input);

    if (nextCursor) {
      await createCustomCommissionJob.dispatch(
        {
          rewardId: input.rewardId,
          periodDate: input.periodDate,
          startAfterPartnerId: nextCursor,
        },
        {
          label: input.rewardId,
          delay: 1,
        },
      );
    }
  },
});

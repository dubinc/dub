import { processClickAggregation } from "@/lib/commissions/process-click-aggregation";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  partnerId: z.string(),
  programId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// Aggregate clicks for links per day for a program enrollment
export const aggregateClicksJob = defineJob({
  name: "aggregate-clicks-job",
  schema: inputSchema,
  defaults: {
    queue: "aggregate-clicks",
  },
  async handle({ programId, partnerId, startDate, endDate }) {
    await processClickAggregation({
      programId,
      partnerId,
      startDate,
      endDate,
    });
  },
});

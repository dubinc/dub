import z from "@/lib/zod";

export const usageQuerySchema = z.object({
  resource: z.enum(["links", "events", "revenue"]),
});

export const usageResponse = z.object({
  date: z.string(),
  value: z.number(),
});

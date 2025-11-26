import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import z from "@/lib/zod";

export const usageQuerySchema = z.object({
  resource: z.enum(["links", "events", "revenue"]),
  folderId: z.string().optional(),
  domain: z.string().optional(),
  groupBy: z.enum(["folder_id", "domain"]).optional(),
  interval: z.enum(DATE_RANGE_INTERVAL_PRESETS).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  timezone: z.string().optional().default("UTC"),
});

export const usageResponse = z.object({
  date: z.string(),
  value: z.number(),
  folder_id: z.string().optional(),
  domain: z.string().optional(),
});

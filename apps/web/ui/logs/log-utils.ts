import { apiLogEnrichedSchema } from "@/lib/api-logs/schemas";
import * as z from "zod/v4";

export type ApiLog = z.infer<typeof apiLogEnrichedSchema>;

export function getStatusCodeBadgeVariant(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode >= 400 && statusCode < 500) return "error";
  return "error";
}

import { getPaginationQuerySchema } from "@/lib/zod/schemas/misc";
import * as z from "zod/v4";

export const API_LOGS_MAX_PAGE_SIZE = 100;

// Schema for ingestion into Tinybird
export const apiLogSchemaTB = z.object({
  id: z.string(),
  timestamp: z.string(),
  workspace_id: z.string(),
  method: z.string(),
  path: z.string(),
  status_code: z.number(),
  duration: z.number(),
  user_agent: z.string(),
  request_body: z.string(),
  response_body: z.string(),
  token_id: z.string(),
  user_id: z.string(),
});

// Schema for query filter params
export const apiLogFilterSchemaTB = z.object({
  workspaceId: z.string(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  tokenId: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

// Schema for query response
export const apiLogResponseSchemaTB = z.object({
  id: z.string(),
  timestamp: z.string(),
  method: z.string(),
  path: z.string(),
  status_code: z.number(),
  duration: z.number(),
  user_agent: z.string(),
  request_body: z.string(),
  response_body: z.string(),
  token_id: z.string(),
  user_id: z.string(),
});

// Schema for count query filter params
export const apiLogCountFilterSchemaTB = apiLogFilterSchemaTB.omit({
  limit: true,
  offset: true,
});

// Schema for count response
export const apiLogCountResponseSchemaTB = z.object({
  count: z.number(),
});

// Schema for single log lookup
export const apiLogByIdFilterSchemaTB = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export const getApiLogsQuerySchema = z
  .object({
    path: z.string().optional(),
    method: z.enum(["POST", "PATCH", "PUT", "DELETE"]).optional(),
    statusCode: z.coerce.number().int().optional(),
    tokenId: z.string().optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: API_LOGS_MAX_PAGE_SIZE }));

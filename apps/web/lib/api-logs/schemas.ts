import { getPaginationQuerySchema } from "@/lib/zod/schemas/misc";
import { tokenSchema } from "@/lib/zod/schemas/token";
import { UserSchema } from "@/lib/zod/schemas/users";
import * as z from "zod/v4";
import { API_LOGS_MAX_PAGE_SIZE } from "./constants";

export const requestTypeSchema = z.enum(["api", "webhook"]);

export const apiLogSchemaTB = z.object({
  id: z.string(),
  timestamp: z.string(),
  workspace_id: z.string(),
  method: z.string(),
  path: z.string(),
  route_pattern: z.string(),
  status_code: z.number(),
  duration: z.number(),
  user_agent: z.string(),
  request_body: z.string(),
  response_body: z.string(),
  token_id: z.string(),
  user_id: z.string(),
  request_type: requestTypeSchema,
});

export const apiLogResponseSchemaTB = apiLogSchemaTB.omit({
  workspace_id: true,
});

// Schema for query filter params
export const apiLogFilterSchemaTB = z.object({
  workspaceId: z.string(),
  routePattern: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  tokenId: z.string().optional(),
  requestId: z.string().optional(),
  requestType: requestTypeSchema.optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const apiLogCountFilterSchemaTB = apiLogFilterSchemaTB
  .omit({
    limit: true,
    offset: true,
  })
  .extend({
    groupBy: z.enum(["routePattern"]).optional(),
  });

export const apiLogCountResponseSchemaTB = {
  count: z.object({
    count: z.number(),
  }),

  routePattern: z.object({
    routePattern: z.string(),
    count: z.number(),
  }),
};

export const apiLogByIdFilterSchemaTB = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

// Schema for enriched API log (with resolved token and user)
export const apiLogEnrichedSchema = apiLogSchemaTB.extend({
  token: tokenSchema
    .pick({
      id: true,
      name: true,
      partialKey: true,
    })
    .nullable(),
  user: UserSchema.nullable(),
});

export const getApiLogsQuerySchema = z
  .object({
    routePattern: z.string().optional(),
    method: z.enum(["POST", "PATCH", "PUT", "DELETE"]).optional(),
    statusCode: z.coerce.number().int().optional(),
    tokenId: z.string().optional(),
    requestId: z.string().optional(),
    requestType: requestTypeSchema.optional(),
  })
  .extend(
    getPaginationQuerySchema({
      pageSize: API_LOGS_MAX_PAGE_SIZE,
    }),
  );

export const getApiLogsCountQuerySchema = getApiLogsQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({
    groupBy: z.enum(["routePattern"]).optional(),
  });

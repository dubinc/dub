import { parseUrlSchema } from "@/lib/zod/schemas/utils";
import * as z from "zod/v4";
import { POSTBACK_TRIGGERS } from "./constants";

export const postbackSchema = z.object({
  id: z.string(),
  url: z.string(),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
  disabledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createPostbackSchema = z.object({
  url: parseUrlSchema,
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
});

export const updatePostbackSchema = z.object({
  url: parseUrlSchema.optional(),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)).optional(),
  disabled: z.boolean().optional(),
});

export const postbackEventSchemaTB = z.object({
  event_id: z.string(),
  postback_id: z.string(),
  message_id: z.string(),
  event: z.enum(POSTBACK_TRIGGERS),
  url: z.string(),
  response_status: z.number(),
  response_body: z.string(),
  request_body: z.string(),
  timestamp: z.string(),
});

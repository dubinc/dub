import { parseUrlSchema } from "@/lib/zod/schemas/utils";
import * as z from "zod/v4";
import { POSTBACK_TRIGGERS } from "./constants";

export const postbackSchema = z.object({
  id: z.string(),
  url: z.string(),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
  disabledAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createPostbackInputSchema = z.object({
  url: parseUrlSchema.refine((u) => u.startsWith("https://"), {
    message: "URL must use HTTPS",
  }),
  triggers: z.array(z.enum(POSTBACK_TRIGGERS)),
});

export const createPostbackOutputSchema = z.object({
  ...postbackSchema.shape,
  secret: z.string(),
});

export const updatePostbackSchema = z.object({
  url: parseUrlSchema.optional().refine((u) => !u || u.startsWith("https://"), {
    message: "URL must use HTTPS",
  }),
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

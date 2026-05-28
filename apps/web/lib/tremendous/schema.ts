import * as z from "zod/v4";

export const tremendousWebhookSchema = z.object({
  event: z.string(),
  uuid: z.string(),
  created_utc: z.string().optional(),
  payload: z.object({
    resource: z.object({
      id: z.string(),
      type: z.string(),
    }),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type TremendousWebhookEvent = z.infer<typeof tremendousWebhookSchema>;

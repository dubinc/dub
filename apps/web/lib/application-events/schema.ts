import * as z from "zod/v4";

export const trackApplicationEventBodySchema = z.object({
  eventName: z.enum(["visit", "start"]),
  url: z.url(),
  referrer: z.string().nullish(),
});

export type TrackApplicationEventBody = z.infer<
  typeof trackApplicationEventBodySchema
>;

export const APPLICATION_ID_COOKIE_PREFIX = "dub_app_evt_id_";

export const APPLICATION_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

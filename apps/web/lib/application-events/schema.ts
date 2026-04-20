import * as z from "zod/v4";

export const trackApplicationEventBodySchema = z.object({
  eventName: z.enum(["visit", "start"]),
  url: z.url(),
  referrer: z.string().nullish(),
});

export type TrackApplicationEventBody = z.infer<
  typeof trackApplicationEventBodySchema
>;

import * as z from "zod/v4";

export const trackApplicationInputSchema = z.object({
  eventName: z.enum(["visit", "start", "submit"]),
  pathname: z.string(),
  applicationId: z.string().nullish(),
  referrerUsername: z.string().nullish(),
});

export type TrackApplicationInput = z.infer<typeof trackApplicationInputSchema>;

export type TrackApplicationEventName = TrackApplicationInput["eventName"];

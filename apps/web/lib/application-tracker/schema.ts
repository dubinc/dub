import * as z from "zod/v4";

export const trackApplicationInputSchema = z.object({
  eventName: z.enum(["visit", "started", "submitted"]),
  applicationId: z.string().optional(),
  referrerUsername: z.string().optional(),
  programIdOrSlug: z.string().optional(),
});

export type TrackApplicationInput = z.infer<typeof trackApplicationInputSchema>;

export type TrackApplicationEventName = TrackApplicationInput["eventName"];

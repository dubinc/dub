import * as z from "zod/v4";

export const applicationEventInputSchema = z.object({
  programSlug: z.string(),
  eventName: z.enum(["visit", "start"]),
  referrerUsername: z.string().nullish(),
});

export type ApplicationEventInput = z.infer<typeof applicationEventInputSchema>;

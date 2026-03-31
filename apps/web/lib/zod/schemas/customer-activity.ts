import * as z from "zod/v4";
import { LinkSchema } from "./links";

export const customerActivityResponseSchema = z.object({
  events: z.array(z.any()), // we've already parsed the events in get-customer-events.ts
  link: LinkSchema.pick({
    id: true,
    domain: true,
    key: true,
    shortLink: true,
  }).nullish(),
});

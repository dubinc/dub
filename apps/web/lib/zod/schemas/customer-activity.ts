import { z } from "zod";
import { LinkSchema } from "./links";

export const customerActivityResponseSchema = z.object({
  ltv: z.number(),
  timeToLead: z.number().nullable(),
  timeToSale: z.number().nullable(),
  events: z.array(z.any()), // we've already parsed the events in get-customer-events.ts
  link: LinkSchema.pick({
    id: true,
    domain: true,
    key: true,
    shortLink: true,
  }).nullish(),
});

import { z } from "zod";

export const ToltProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  payout_term: z.string(),
  total_affiliates: z.number(),
});

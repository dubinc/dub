import { z } from "zod";

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().optional(),
  type: z.enum(["affiliate", "referral"]),
});

export const createProgramSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

import { z } from "zod";

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  readme: z.string().nullish(),
  developer: z.string(),
  website: z.string(),
  logo: z.string().nullable(),
  screenshots: z.array(z.string()).nullable(),
  installUrl: z.string().nullable(),
  verified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  installations: z.number().default(0),
});

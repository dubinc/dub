import { z } from "zod";

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  readme: z.string().nullish(),
  developer: z.string(),
  website: z.string(),
  logo: z.string().nullish(),
  screenshots: z.array(z.string()).nullish(),
  installUrl: z.string().nullish(),
  verified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  installations: z.number().default(0),
});

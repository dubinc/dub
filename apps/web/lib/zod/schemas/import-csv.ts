import { z } from "zod";

export const linkMappingSchema = z.object({
  domain: z.string(),
  url: z.string(),
  key: z.string(),
  createdAt: z.string().optional(),
  tags: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

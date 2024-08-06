import { z } from "zod";

export const linkMappingSchema = z.object({
  link: z.string(),
  url: z.string(),
  createdAt: z.string().optional(),
  tags: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

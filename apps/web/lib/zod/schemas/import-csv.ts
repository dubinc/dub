import * as z from "zod/v4";

export const linkMappingSchema = z.object({
  link: z.string(),
  url: z.string(),
  createdAt: z.string().optional(),
  tags: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

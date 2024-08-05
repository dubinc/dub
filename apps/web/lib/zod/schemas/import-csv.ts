import { z } from "zod";
import { parseDateSchema } from "./utils";

export const linkMappingSchema = z.object({
  domain: z.string(),
  url: z.string(),
  key: z.string(),
  createdAt: parseDateSchema.nullish(),
  tags: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
});

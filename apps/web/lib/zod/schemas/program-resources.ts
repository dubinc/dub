import { z } from "zod";

export const PROGRAM_RESOURCE_TYPES = ["logo", "file", "color"] as const;

export type ProgramResourceType = (typeof PROGRAM_RESOURCE_TYPES)[number];

export const programResourceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  url: z.string().url(),
});

export const programResourceColorSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

export const programResourcesSchema = z.object({
  logos: z.array(programResourceFileSchema),
  colors: z.array(programResourceColorSchema),
  files: z.array(programResourceFileSchema),
});

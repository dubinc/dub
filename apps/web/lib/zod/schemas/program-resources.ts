import * as z from "zod/v4";

export const PROGRAM_RESOURCE_TYPES = [
  "logo",
  "file",
  "color",
  "link",
] as const;

export type ProgramResourceType = (typeof PROGRAM_RESOURCE_TYPES)[number];

export const programResourceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  url: z.url(),
});

export const programResourceColorSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

export const programResourceLinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.url(),
});

export const programResourcesSchema = z.object({
  logos: z.array(programResourceFileSchema),
  colors: z.array(programResourceColorSchema),
  files: z.array(programResourceFileSchema),
  links: z.array(programResourceLinkSchema).default([]),
});

export type ProgramResourceFile = z.infer<typeof programResourceFileSchema>;
export type ProgramResourceColor = z.infer<typeof programResourceColorSchema>;
export type ProgramResourceLink = z.infer<typeof programResourceLinkSchema>;
export type ProgramResources = z.infer<typeof programResourcesSchema>;

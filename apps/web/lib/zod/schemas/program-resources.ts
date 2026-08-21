import * as z from "zod/v4";

const PROGRAM_RESOURCE_TYPES = ["logo", "file", "color", "link"] as const;

export type ProgramResourceType = (typeof PROGRAM_RESOURCE_TYPES)[number];

export const programResourceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  url: z.httpUrl(),
});

export const programResourceColorSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

// Allow http(s) and mailto links, but block dangerous schemes (e.g. javascript:, data:)
const programResourceLinkUrlSchema = z.url({
  protocol: /^(https?|mailto)$/,
});

export const programResourceLinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: programResourceLinkUrlSchema,
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

const baseResourceInputSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, "Name is required"),
});

// logo and file share the same input fields
const fileResourceInputFields = {
  key: z.string(),
  fileSize: z.number().int().positive(),
};

const logoResourceInputSchema = baseResourceInputSchema.extend({
  resourceType: z.literal("logo"),
  ...fileResourceInputFields,
});

const fileResourceInputSchema = baseResourceInputSchema.extend({
  resourceType: z.literal("file"),
  ...fileResourceInputFields,
});

const colorResourceInputSchema = baseResourceInputSchema.extend({
  resourceType: z.literal("color"),
  color: z.string(),
});

const linkResourceInputSchema = baseResourceInputSchema.extend({
  resourceType: z.literal("link"),
  url: programResourceLinkUrlSchema,
});

export const addProgramResourceSchema = z.discriminatedUnion("resourceType", [
  logoResourceInputSchema,
  fileResourceInputSchema,
  colorResourceInputSchema,
  linkResourceInputSchema,
]);

// Update = add variants + resourceId, with mutable fields optional.
// resourceType stays required so the discriminated union still works.
export const updateProgramResourceSchema = z.discriminatedUnion(
  "resourceType",
  [
    logoResourceInputSchema
      .partial({ name: true, key: true, fileSize: true })
      .extend({ resourceId: z.string() }),
    fileResourceInputSchema
      .partial({ name: true, key: true, fileSize: true })
      .extend({ resourceId: z.string() }),
    colorResourceInputSchema
      .partial({ name: true, color: true })
      .extend({ resourceId: z.string() }),
    linkResourceInputSchema
      .partial({ name: true, url: true })
      .extend({ resourceId: z.string() }),
  ],
);

export const deleteProgramResourceSchema = z.object({
  workspaceId: z.string(),
  resourceType: z.enum(PROGRAM_RESOURCE_TYPES),
  resourceId: z.string(),
});

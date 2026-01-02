import * as z from "zod/v4";

export const createUTMTemplateBodySchema = z.object({
  name: z.string().trim().min(1, "UTM name is required").max(50),
  utm_source: z
    .string()
    .trim()
    .max(190)
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe("The UTM source of the short link."),
  utm_medium: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .transform((v) => (v === "" ? null : v))
    .describe("The UTM medium of the short link."),
  utm_campaign: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .transform((v) => (v === "" ? null : v))
    .describe("The UTM campaign of the short link."),
  utm_term: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .transform((v) => (v === "" ? null : v))
    .describe("The UTM term of the short link."),
  utm_content: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .transform((v) => (v === "" ? null : v))
    .describe("The UTM content of the short link."),
  ref: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .transform((v) => (v === "" ? null : v))
    .describe("The ref of the short link."),
});

export const updateUTMTemplateBodySchema = createUTMTemplateBodySchema;

export const UTMTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  utm_source: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .describe("The UTM source of the short link."),
  utm_medium: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .describe("The UTM medium of the short link."),
  utm_campaign: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .describe("The UTM campaign of the short link."),
  utm_term: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .describe("The UTM term of the short link."),
  utm_content: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .describe("The UTM content of the short link."),
  ref: z
    .string()
    .trim()
    .max(190)
    .nullish()
    .describe("The ref of the short link."),
});

export const UTM_TAGS_PLURAL_LIST = [
  "utm_sources",
  "utm_mediums",
  "utm_campaigns",
  "utm_terms",
  "utm_contents",
];

export type UTM_TAGS_PLURAL =
  | "utm_sources"
  | "utm_mediums"
  | "utm_campaigns"
  | "utm_terms"
  | "utm_contents";

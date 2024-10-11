import z from "@/lib/zod";

export const createUTMTemplateBodySchema = z.object({
  name: z.string(),
  utm_source: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM source of the short link."),
  utm_medium: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM medium of the short link."),
  utm_campaign: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM campaign of the short link."),
  utm_term: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM term of the short link."),
  utm_content: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM content of the short link."),
  ref: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
    .describe("The ref of the short link."),
});

export const updateUTMTemplateBodySchema = createUTMTemplateBodySchema;

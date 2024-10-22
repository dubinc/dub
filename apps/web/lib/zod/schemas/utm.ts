import z from "@/lib/zod";

export const createUTMTemplateBodySchema = z.object({
  name: z.string().min(1).max(50).trim(),
  utm_source: z
    .string()
    .max(190)
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM source of the short link."),
  utm_medium: z
    .string()
    .max(190)
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM medium of the short link."),
  utm_campaign: z
    .string()
    .max(190)
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM campaign of the short link."),
  utm_term: z
    .string()
    .max(190)
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM term of the short link."),
  utm_content: z
    .string()
    .max(190)
    .nullish()
    .transform((v) => v ?? null)
    .describe("The UTM content of the short link."),
  ref: z
    .string()
    .max(190)
    .nullish()
    .transform((v) => v ?? null)
    .describe("The ref of the short link."),
});

export const updateUTMTemplateBodySchema = createUTMTemplateBodySchema;

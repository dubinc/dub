import { z } from "zod";

const programLanderBlockTitleSchema = z.string().optional();

export const programLanderImageBlockSchema = z.object({
  type: z.literal("image"),
  data: z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
});

export const programLanderTextBlockSchema = z.object({
  type: z.literal("text"),
  data: z.object({
    title: programLanderBlockTitleSchema,
    content: z.string(),
  }),
});

export const programLanderFileSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  external: z.boolean().optional(),
});

export const programLanderFilesBlockSchema = z.object({
  type: z.literal("files"),
  data: z.object({
    title: programLanderBlockTitleSchema,
    items: z.array(programLanderFileSchema),
  }),
});

export const programLanderAccordionItemSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const programLanderAccordionBlockSchema = z.object({
  type: z.literal("accordion"),
  data: z.object({
    title: programLanderBlockTitleSchema,
    items: z.array(programLanderAccordionItemSchema),
  }),
});

export const programLanderBlockSchema = z.discriminatedUnion("type", [
  programLanderImageBlockSchema,
  programLanderTextBlockSchema,
  programLanderFilesBlockSchema,
  programLanderAccordionBlockSchema,
]);

export const programLanderSchema = z.object({
  blocks: z.array(programLanderBlockSchema),
});

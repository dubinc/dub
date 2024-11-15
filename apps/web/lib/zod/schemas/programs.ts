import { intervals } from "@/lib/analytics/constants";
import { CommissionInterval, CommissionType } from "@prisma/client";
import { z } from "zod";
import { parseDateSchema } from "./utils";

export const createProgramSchema = z.object({
  name: z.string(),
  commissionType: z.nativeEnum(CommissionType),
  commissionAmount: z.number(),
  recurringCommission: z.boolean(),
  recurringInterval: z.nativeEnum(CommissionInterval).nullable(),
  recurringDuration: z.number().nullable(),
  isLifetimeRecurring: z.boolean().nullable(),
  cookieLength: z.number().min(1).max(180),
});

export const getProgramMetricsQuerySchema = z.object({
  interval: z.enum(intervals).default("30d"),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});

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

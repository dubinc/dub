import { intervals } from "@/lib/analytics/constants";
import {
  CommissionInterval,
  CommissionType,
  ProgramEnrollmentStatus,
  ProgramType,
} from "@prisma/client";
import { z } from "zod";
import { LinkSchema } from "./links";
import { parseDateSchema } from "./utils";

export const ProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  brandColor: z.string().nullable(),
  type: z.nativeEnum(ProgramType),
  cookieLength: z.number(),
  commissionAmount: z.number(),
  commissionType: z.nativeEnum(CommissionType),
  recurringCommission: z.boolean(),
  recurringDuration: z.number().nullable(),
  recurringInterval: z.nativeEnum(CommissionInterval).nullable(),
  isLifetimeRecurring: z.boolean().nullable(),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  wordmark: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createProgramSchema = z.object({
  name: z.string(),
  commissionType: z.nativeEnum(CommissionType),
  commissionAmount: z.number(),
  recurringCommission: z.boolean(),
  recurringInterval: z.nativeEnum(CommissionInterval).nullable(),
  recurringDuration: z.number().nullable(),
  isLifetimeRecurring: z.boolean().nullable(),
  cookieLength: z.number().min(1).max(180),
  domain: z.string().nullable(),
  url: z.string().nullable(),
});

export const ProgramEnrollmentSchema = z.object({
  partnerId: z.string(),
  programId: z.string(),
  program: ProgramSchema,
  status: z.nativeEnum(ProgramEnrollmentStatus),
  link: LinkSchema.pick({
    id: true,
    shortLink: true,
    url: true,
    clicks: true,
    leads: true,
    sales: true,
    saleAmount: true,
  }).nullable(),
  createdAt: z.date(),
});

export const getProgramMetricsQuerySchema = z.object({
  interval: z.enum(intervals).default("30d"),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});

export const ProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  program: ProgramSchema,
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

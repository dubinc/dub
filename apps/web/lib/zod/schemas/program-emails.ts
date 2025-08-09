import { ProgramEmailStatus, ProgramEmailType } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";

export const programEmailSchema = z.object({
  id: z.string(),
  programId: z.string(),

  type: z.nativeEnum(ProgramEmailType),
  status: z.nativeEnum(ProgramEmailStatus),

  name: z.string(),
  subject: z.string(),
  body: z.string(),

  deliverAt: z.date().nullable(),
  deliverWhen: z.any().nullable(), // TODO

  createdAt: z.date(),
  updatedAt: z.date(),
});

const PROGRAM_EMAILS_MAX_PAGE_SIZE = 100;

export const programEmailsQuerySchema = z
  .object({
    type: z.nativeEnum(ProgramEmailType).optional(),
    status: z.nativeEnum(ProgramEmailStatus).optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "deliverAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .merge(getPaginationQuerySchema({ pageSize: PROGRAM_EMAILS_MAX_PAGE_SIZE }));

export const programEmailsCountQuerySchema = programEmailsQuerySchema
  .pick({
    type: true,
    status: true,
  })
  .merge(
    z.object({
      groupBy: z.enum(["type", "status"]).optional(),
    }),
  );

export const programEmailsCountSchema = z.object({
  count: z.number(),
});

export const programEmailsGroupedCountSchema = z.record(z.number());

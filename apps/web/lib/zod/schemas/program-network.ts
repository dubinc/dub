import { Category, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { ProgramSchema } from "./programs";

export const NetworkProgramSchema = ProgramSchema.pick({
  id: true,
  slug: true,
  name: true,
  logo: true,
  domain: true,
  url: true,
  rewards: true,
  discount: true,
}).extend({
  status: z.nativeEnum(ProgramEnrollmentStatus).nullable(),
  categories: z.array(z.nativeEnum(Category)),
});

export const PROGRAM_NETWORK_MAX_PAGE_SIZE = 100;

export const getNetworkProgramsQuerySchema = z
  .object({
    category: z.nativeEnum(Category).optional(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: PROGRAM_NETWORK_MAX_PAGE_SIZE,
    }),
  );

export const getNetworkProgramsCountQuerySchema = getNetworkProgramsQuerySchema
  .omit({
    page: true,
    pageSize: true,
  })
  .extend({
    groupBy: z.enum(["category"]).optional(),
  });

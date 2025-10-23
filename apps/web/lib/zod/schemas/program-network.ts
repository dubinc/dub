import { Category, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { z } from "zod";
import { DiscountSchema } from "./discount";
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
}).extend({
  discount: DiscountSchema.nullish(),
  status: z.nativeEnum(ProgramEnrollmentStatus).nullable(),
  categories: z.array(z.nativeEnum(Category)),
});

export const PROGRAM_NETWORK_MAX_PAGE_SIZE = 100;

const rewardTypes = ["sale", "lead", "click", "discount"] as const;
const rewardTypeSchema = z.enum(rewardTypes);

export const getNetworkProgramsQuerySchema = z
  .object({
    category: z.nativeEnum(Category).optional(),
    rewardType: z
      .union([z.string(), z.array(rewardTypeSchema)])
      .transform((v) =>
        Array.isArray(v)
          ? v
          : v.split(",").filter((v) => rewardTypes.includes(v)),
      )
      .optional(),
    search: z.string().optional(),
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
    groupBy: z.enum(["category", "rewardType"]).optional(),
  });

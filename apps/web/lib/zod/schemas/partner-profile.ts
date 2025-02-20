import { intervals } from "@/lib/analytics/constants";
import { z } from "zod";
import { LinkSchema } from "./links";
import {
  getProgramSalesCountQuerySchema,
  getProgramSalesQuerySchema,
  ProgramSaleResponseSchema,
} from "./program-sales";

export const PartnerEarningsSchema = ProgramSaleResponseSchema.omit({
  partner: true,
  customer: true,
}).merge(
  z.object({
    type: z.string(),
    customer: z
      .object({
        id: z.string(),
        email: z
          .string()
          .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "********")),
        avatar: z.string().nullable(),
      })
      .nullable(),
    link: LinkSchema.pick({
      id: true,
      shortLink: true,
      url: true,
    }),
  }),
);

export const getPartnerEarningsQuerySchema = getProgramSalesQuerySchema
  .omit({
    partnerId: true,
    sortBy: true,
  })
  .merge(
    z.object({
      interval: z.enum(intervals).default("30d"),
      type: z.enum(["click", "lead", "sale"]).optional(),
      linkId: z.string().optional(),
      sortBy: z.enum(["createdAt", "amount", "earnings"]).default("createdAt"),
    }),
  );

export const getPartnerEarningsCountQuerySchema =
  getProgramSalesCountQuerySchema
    .omit({
      partnerId: true,
    })
    .merge(
      z.object({
        interval: z.enum(intervals).default("30d"),
        type: z.enum(["click", "lead", "sale"]).optional(),
        linkId: z.string().optional(),
        groupBy: z.enum(["linkId", "customerId", "status", "type"]).optional(),
      }),
    );

export const getPartnerEarningsTimeseriesSchema =
  getPartnerEarningsCountQuerySchema.extend({
    timezone: z.string().optional(),
  });

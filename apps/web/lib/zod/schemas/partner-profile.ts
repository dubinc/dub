import {
  DUB_PARTNERS_ANALYTICS_INTERVAL,
  intervals,
} from "@/lib/analytics/constants";
import { z } from "zod";
import {
  CommissionSchema,
  getCommissionsCountQuerySchema,
  getCommissionsQuerySchema,
} from "./commissions";
import { CustomerEnrichedSchema } from "./customers";
import { LinkSchema } from "./links";

export const PartnerEarningsSchema = CommissionSchema.merge(
  z.object({
    type: z.string(),
    quantity: z.number().nullable(),
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

export const getPartnerEarningsQuerySchema = getCommissionsQuerySchema
  .omit({
    partnerId: true,
    sortBy: true,
  })
  .merge(
    z.object({
      interval: z.enum(intervals).default(DUB_PARTNERS_ANALYTICS_INTERVAL),
      type: z.enum(["click", "lead", "sale"]).optional(),
      linkId: z.string().optional(),
      sortBy: z.enum(["createdAt", "amount", "earnings"]).default("createdAt"),
    }),
  );

export const getPartnerEarningsCountQuerySchema = getCommissionsCountQuerySchema
  .omit({
    partnerId: true,
  })
  .merge(
    z.object({
      interval: z.enum(intervals).default(DUB_PARTNERS_ANALYTICS_INTERVAL),
      type: z.enum(["click", "lead", "sale"]).optional(),
      linkId: z.string().optional(),
      groupBy: z.enum(["linkId", "customerId", "status", "type"]).optional(),
    }),
  );

export const getPartnerEarningsTimeseriesSchema =
  getPartnerEarningsCountQuerySchema.extend({
    timezone: z.string().optional(),
  });

export const PartnerProfileLinkSchema = LinkSchema.pick({
  id: true,
  domain: true,
  key: true,
  shortLink: true,
  url: true,
  clicks: true,
  leads: true,
  sales: true,
  saleAmount: true,
  comments: true,
}).extend({
  createdAt: z.string().or(z.date()),
});

export const PartnerProfileCustomerSchema = CustomerEnrichedSchema.pick({
  id: true,
  createdAt: true,
  country: true,
  link: true,
}).extend({
  email: z
    .string()
    .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "********")),
});

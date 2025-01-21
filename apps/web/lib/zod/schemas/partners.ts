import { intervals } from "@/lib/analytics/constants";
import {
  PartnerStatus,
  ProgramEnrollmentStatus,
  SaleStatus,
} from "@dub/prisma/client";
import { COUNTRY_CODES } from "@dub/utils";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { LinkSchema } from "./links";
import { getPaginationQuerySchema } from "./misc";
import { ProgramEnrollmentSchema } from "./programs";
import { parseDateSchema } from "./utils";

export const PARTNERS_MAX_PAGE_SIZE = 100;
export const PAYOUTS_MAX_PAGE_SIZE = 100;

export const partnersQuerySchema = z
  .object({
    status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
    country: z.string().optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(["createdAt", "clicks", "leads", "sales", "earnings"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    ids: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("IDs of partners to filter by."),
  })
  .merge(getPaginationQuerySchema({ pageSize: PARTNERS_MAX_PAGE_SIZE }));

export const partnersCountQuerySchema = z.object({
  status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
  country: z.string().optional(),
  groupBy: z.enum(["status", "country"]).optional(),
});

export const partnerInvitesQuerySchema = getPaginationQuerySchema({
  pageSize: 100,
});

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  country: z.string(),
  bio: z.string().nullable(),
  status: z.nativeEnum(PartnerStatus),
  stripeConnectId: z.string().nullable(),
  couponId: z.string().nullish(),
  payoutsEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EnrolledPartnerSchema = PartnerSchema.omit({
  status: true,
})
  .merge(ProgramEnrollmentSchema)
  .omit({
    program: true,
  })
  .extend({
    earnings: z.number(),
  });

export const LeaderboardPartnerSchema = z.object({
  partner: z.object({
    id: z.string(),
    name: z.string().transform((name) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length < 2) return name; // Return original if single word
      const firstName = parts[0];
      const lastInitial = parts[parts.length - 1][0];
      return `${firstName} ${lastInitial}.`;
    }),
  }),
  link: LinkSchema.pick({
    shortLink: true,
    clicks: true,
    leads: true,
    sales: true,
    saleAmount: true,
  }),
});

export const SaleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.nativeEnum(SaleStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getSalesQuerySchema = z
  .object({
    status: z.nativeEnum(SaleStatus).optional(),
    sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    interval: z.enum(intervals).default("1y"),
    start: parseDateSchema.optional(),
    end: parseDateSchema.optional(),
    customerId: z.string().optional(),
    payoutId: z.string().optional(),
    partnerId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const SaleResponseSchema = SaleSchema.merge(
  z.object({
    customer: CustomerSchema,
    partner: PartnerSchema,
  }),
);

export const getSalesCountQuerySchema = getSalesQuerySchema.omit({
  page: true,
  pageSize: true,
  sortOrder: true,
  sortBy: true,
});

export const getSalesAmountQuerySchema = getSalesQuerySchema.pick({
  start: true,
  end: true,
  partnerId: true,
});

export const getPartnerSalesQuerySchema = getSalesQuerySchema.omit({
  partnerId: true,
});

export const PartnerSaleResponseSchema = SaleResponseSchema.omit({
  partner: true,
  customer: true,
}).merge(
  z.object({
    customer: z.object({
      email: z
        .string()
        .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "********")),
      avatar: z.string().nullable(),
    }),
  }),
);

export const getPartnerSalesCountQuerySchema = getSalesCountQuerySchema.omit({
  partnerId: true,
});

export const createPartnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("Full legal name of the partner."),
  email: z
    .string()
    .trim()
    .min(1)
    .max(190)
    .email()
    .describe(
      "Email for the partner in your system. Partners will be able to claim their profile by signing up to Dub Partners with this email.",
    ),
  username: z
    .string()
    .min(1)
    .max(100)
    .describe(
      "A unique username for the partner in your system. This will be used to create a short link for the partner using your program's default domain.",
    ),
  image: z
    .string()
    .nullish()
    .describe(
      "Avatar image for the partner – if not provided, a default avatar will be used.",
    ),
  country: z
    .enum(COUNTRY_CODES)
    .nullish()
    .describe("Country where the partner is based."),
  description: z
    .string()
    .max(5000)
    .nullish()
    .describe("A brief description of the partner and their background."),
});

export const onboardPartnerSchema = createPartnerSchema.merge(
  z.object({
    image: z.string(),
    country: z.enum(COUNTRY_CODES),
  }),
);

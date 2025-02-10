import { intervals } from "@/lib/analytics/constants";
import {
  CommissionStatus,
  PartnerStatus,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import { COUNTRY_CODES } from "@dub/utils";
import { z } from "zod";
import { analyticsQuerySchema } from "./analytics";
import { analyticsResponse } from "./analytics-response";
import { CustomerSchema } from "./customers";
import { createLinkBodySchema } from "./links";
import { getPaginationQuerySchema } from "./misc";
import { ProgramEnrollmentSchema } from "./programs";
import { parseDateSchema, parseUrlSchema } from "./utils";

export const PARTNERS_MAX_PAGE_SIZE = 100;
export const PAYOUTS_MAX_PAGE_SIZE = 100;

export const partnersQuerySchema = z
  .object({
    status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
    country: z.string().optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(["createdAt", "clicks", "leads", "sales", "saleAmount", "earnings"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    tenantId: z
      .string()
      .optional()
      .describe("The ID of the partner within your system."),
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

// Used by GET+POST /api/partners and partner.created webhook
export const EnrolledPartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  email: true,
  image: true,
  country: true,
  createdAt: true,
})
  .merge(
    ProgramEnrollmentSchema.pick({
      status: true,
      programId: true,
      tenantId: true,
      links: true,
    }),
  )
  .extend({
    clicks: z.number().default(0),
    leads: z.number().default(0),
    sales: z.number().default(0),
    saleAmount: z.number().default(0),
    earnings: z.number().default(0),
  });

export const LeaderboardPartnerSchema = z.object({
  id: z.string(),
  name: z.string().transform((name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name; // Return original if single word
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0];
    return `${firstName} ${lastInitial}.`;
  }),
  clicks: z.number().default(0),
  leads: z.number().default(0),
  sales: z.number().default(0),
  saleAmount: z.number().default(0),
});

export const SaleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.nativeEnum(CommissionStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getSalesQuerySchema = z
  .object({
    status: z.nativeEnum(CommissionStatus).optional(),
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

export const getSaleAmountQuerySchema = getSalesQuerySchema.pick({
  start: true,
  end: true,
  partnerId: true,
});

export const getPartnerSalesQuerySchema = getSalesQuerySchema.omit({
  partnerId: true,
});

export const PartnerEarningsSchema = SaleResponseSchema.omit({
  partner: true,
  customer: true,
}).merge(
  z.object({
    type: z.string(),
    customer: z
      .object({
        email: z
          .string()
          .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "********")),
        avatar: z.string().nullable(),
      })
      .nullable(),
  }),
);

export const getPartnerSalesCountQuerySchema = getSalesCountQuerySchema.omit({
  partnerId: true,
});

export const createPartnerSchema = z.object({
  programId: z
    .string()
    .describe("The ID of the program to create a partner for."),
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
  tenantId: z
    .string()
    .optional()
    .describe("The ID of the partner in your system."),
  linkProps: createLinkBodySchema
    .omit({
      url: true,
      domain: true,
      key: true,
      publicStats: true,
      tagId: true,
      geo: true,
      projectId: true,
      programId: true,
      webhookIds: true,
      trackConversion: true,
    })
    .partial()
    .optional()
    .describe(
      "Additional properties that you can pass to the partner's short link. Will be used to override the default link properties for this partner.",
    ),
});

export const onboardPartnerSchema = createPartnerSchema
  .omit({
    programId: true,
    username: true,
    linkProps: true,
  })
  .merge(
    z.object({
      image: z.string(),
      country: z.enum(COUNTRY_CODES),
    }),
  );

export const createPartnerLinkSchema = z
  .object({
    programId: z
      .string()
      .describe("The ID of the program that the partner is enrolled in."),
    partnerId: z
      .string()
      .nullish()
      .describe(
        "The ID of the partner to create a link for. Will take precedence over `tenantId` if provided.",
      ),
    tenantId: z
      .string()
      .nullish()
      .describe(
        "The ID of the partner in your system. If both `partnerId` and `tenantId` are not provided, an error will be thrown.",
      ),
    url: parseUrlSchema
      .describe(
        "The URL to shorten (if not provided, the program's default URL will be used). Will throw an error if the domain doesn't match the program's default URL domain.",
      )
      .nullish(),
    key: z
      .string()
      .max(190)
      .optional()
      .describe(
        "The short link slug. If not provided, a random 7-character slug will be generated.",
      ),
  })
  .merge(
    createPartnerSchema.pick({
      linkProps: true,
    }),
  );

export const upsertPartnerLinkSchema = createPartnerLinkSchema.merge(
  z.object({
    url: parseUrlSchema.describe(
      "The URL to upsert for. Will throw an error if the domain doesn't match the program's default URL domain.",
    ),
  }),
);

// For /api/partners/analytics
export const partnerAnalyticsQuerySchema = analyticsQuerySchema
  .pick({
    partnerId: true,
    tenantId: true,
    interval: true,
    start: true,
    end: true,
    timezone: true,
  })
  .merge(
    z.object({
      groupBy: z
        .enum(["top_links", "timeseries", "count"])
        .default("count")
        .describe(
          "The parameter to group the analytics data points by. Defaults to `count` if undefined.",
        ),
      programId: z
        .string()
        .describe("The ID of the program to retrieve analytics for."),
    }),
  );

const earningsSchema = z.object({
  earnings: z.number().default(0),
});

export const partnersTopLinksSchema =
  analyticsResponse["top_links"].merge(earningsSchema);

export const partnerAnalyticsResponseSchema = {
  count: analyticsResponse["count"]
    .merge(earningsSchema)
    .openapi({ ref: "PartnerAnalyticsCount", title: "PartnerAnalyticsCount" }),

  timeseries: analyticsResponse["timeseries"].merge(earningsSchema).openapi({
    ref: "PartnerAnalyticsTimeseries",
    title: "PartnerAnalyticsTimeseries",
  }),

  top_links: partnersTopLinksSchema.openapi({
    ref: "PartnerAnalyticsTopLinks",
    title: "PartnerAnalyticsTopLinks",
  }),
} as const;

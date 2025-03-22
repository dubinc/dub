import {
  PartnerBannedReason,
  PartnerProfileType,
  PartnerStatus,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import { COUNTRY_CODES } from "@dub/utils";
import { z } from "zod";
import { analyticsQuerySchema } from "./analytics";
import { analyticsResponse } from "./analytics-response";
import { createLinkBodySchema } from "./links";
import { getPaginationQuerySchema } from "./misc";
import { ProgramEnrollmentSchema } from "./programs";
import { parseUrlSchema } from "./utils";

export const PARTNERS_MAX_PAGE_SIZE = 100;
export const PAYOUTS_MAX_PAGE_SIZE = 100;

export const exportPartnerColumns = [
  { id: "id", label: "ID", default: true },
  { id: "name", label: "Name", default: true },
  { id: "email", label: "Email", default: true },
  { id: "country", label: "Country", default: true },
  { id: "status", label: "Status", default: true },
  {
    id: "payoutsEnabledAt",
    label: "Payouts enabled at",
    default: false,
  },
  { id: "createdAt", label: "Enrolled at", default: true },
  { id: "createdAt", label: "Enrolled at", default: true },
  { id: "description", label: "Description", default: false },
  { id: "clicks", label: "Clicks", default: false },
  { id: "leads", label: "Leads", default: false },
  { id: "sales", label: "Sales", default: false },
  { id: "saleAmount", label: "Sale amount", default: false },
  { id: "website", label: "Website", default: false },
  { id: "youtube", label: "YouTube", default: false },
  { id: "twitter", label: "Twitter", default: false },
  { id: "linkedin", label: "LinkedIn", default: false },
  { id: "instagram", label: "Instagram", default: false },
  { id: "tiktok", label: "TikTok", default: false },
];

export const BAN_PARTNER_REASONS = {
  tos_violation: "Terms of Service Violation",
  inappropriate_content: "Inappropriate or Offensive Content",
  fake_traffic: "Artificial Traffic Generation",
  fraud: "Fraudulent Activity",
  spam: "Spam or Misleading Content",
  brand_abuse: "Brand Abuse or Trademark Violations",
} as const;

export const exportPartnersColumnsDefault = exportPartnerColumns
  .filter((column) => column.default)
  .map((column) => column.id);

export const partnersQuerySchema = z
  .object({
    status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
    country: z.string().optional(),
    rewardId: z.string().optional(),
    search: z.string().optional(),
    sortBy: z
      .enum([
        "createdAt",
        "clicks",
        "leads",
        "sales",
        "saleAmount",
        "commissions",
        "netRevenue",
      ])
      .default("saleAmount"),
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

export const partnersExportQuerySchema = partnersQuerySchema
  .omit({ page: true, pageSize: true })
  .merge(
    z.object({
      columns: z
        .string()
        .default(exportPartnersColumnsDefault.join(","))
        .transform((v) => v.split(",")),
    }),
  );

export const partnersCountQuerySchema = partnersQuerySchema
  .omit({
    sortBy: true,
    sortOrder: true,
    page: true,
    pageSize: true,
  })
  .extend({
    groupBy: z.enum(["status", "country", "rewardId"]).optional(),
  });

export const partnerInvitesQuerySchema = getPaginationQuerySchema({
  pageSize: 100,
});

export const PartnerOnlinePresenceSchema = z.object({
  website: z.string().nullable(),
  websiteTxtRecord: z.string().nullable(),
  websiteVerifiedAt: z.date().nullable(),
  youtube: z.string().nullable(),
  youtubeVerifiedAt: z.date().nullable(),
  twitter: z.string().nullable(),
  twitterVerifiedAt: z.date().nullable(),
  linkedin: z.string().nullable(),
  linkedinVerifiedAt: z.date().nullable(),
  instagram: z.string().nullable(),
  instagramVerifiedAt: z.date().nullable(),
  tiktok: z.string().nullable(),
  tiktokVerifiedAt: z.date().nullable(),
});

export const PartnerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    companyName: z.string().nullable(),
    profileType: z.nativeEnum(PartnerProfileType),
    email: z.string().nullable(),
    image: z.string().nullable(),
    description: z.string().nullish(),
    country: z.string().nullable(),
    status: z.nativeEnum(PartnerStatus),
    stripeConnectId: z.string().nullable(),
    payoutsEnabledAt: z.date().nullable(),

    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .merge(PartnerOnlinePresenceSchema);

// Used externally by GET+POST /api/partners and partner.created webhook
export const EnrolledPartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  email: true,
  image: true,
  description: true,
  country: true,
  payoutsEnabledAt: true,
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
  })
  .extend({
    applicationId: z.string().nullish(),
  });

// Used internally in the Dub dashboard for partners table
export const EnrolledPartnerSchemaWithExpandedFields =
  EnrolledPartnerSchema.merge(PartnerOnlinePresenceSchema).extend({
    commissions: z.number().default(0),
    netRevenue: z.number().default(0),
    bannedAt: z.date().nullish(),
    bannedReason: z
      .enum(
        Object.keys(BAN_PARTNER_REASONS) as [
          PartnerBannedReason,
          ...PartnerBannedReason[],
        ],
      )
      .nullish(),
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

export const PARTNER_CUSTOMERS_MAX_PAGE_SIZE = 100;

export const getPartnerCustomersQuerySchema = z
  .object({
    search: z.string().optional(),
  })
  .merge(
    getPaginationQuerySchema({ pageSize: PARTNER_CUSTOMERS_MAX_PAGE_SIZE }),
  );

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
    .max(100)
    .nullish()
    .describe(
      "A unique username for the partner in your system (max 100 characters). This will be used to create a short link for the partner using your program's default domain. If not provided, Dub will try to generate a username from the partner's name or email.",
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
      partnerId: true,
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
    email: true,
    linkProps: true,
  })
  .merge(
    z.object({
      image: z.string(),
      country: z.enum(COUNTRY_CODES),
      profileType: z.enum(["individual", "company"]).default("individual"),
      companyName: z.string().nullish(),
    }),
  )
  .refine(
    (data) => {
      if (data.profileType === "company") {
        return !!data.companyName;
      }

      return true;
    },
    {
      message: "Legal company name is required.",
      path: ["companyName"],
    },
  )
  .transform((data) => ({
    ...data,
    companyName: data.profileType === "individual" ? null : data.companyName,
  }));

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
    comments: z.string().nullish().describe("The comments for the short link."),
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

export const updatePartnerSaleSchema = z
  .object({
    programId: z.string(),
    invoiceId: z.string(),
    amount: z
      .number()
      .min(0)
      .describe("The new absolute amount for the sale.")
      .optional(),
    modifyAmount: z
      .number()
      .describe(
        "Modify the current sale amount: use positive values to increase the amount, negative values to decrease it.",
      )
      .optional(),
    currency: z
      .string()
      .default("usd")
      .transform((val) => val.toLowerCase())
      .describe(
        "The currency of the sale amount to update. Accepts ISO 4217 currency codes.",
      ),
  })
  .refine(
    (data) => data.amount !== undefined || data.modifyAmount !== undefined,
    {
      message: "Either amount or modifyAmount must be provided.",
      path: ["amount"],
    },
  );

export const invitePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().min(1).max(100),
  linkId: z.string(),
  rewardId: z.string().optional(),
  discountId: z.string().optional(),
});

export const banPartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  reason: z.enum(
    Object.keys(BAN_PARTNER_REASONS) as [
      PartnerBannedReason,
      ...PartnerBannedReason[],
    ],
  ),
});

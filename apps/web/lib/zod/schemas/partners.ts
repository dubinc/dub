import {
  IndustryInterest,
  MonthlyTraffic,
  PartnerBannedReason,
  PartnerProfileType,
  PreferredEarningStructure,
  ProgramEnrollmentStatus,
  SalesChannel,
} from "@dub/prisma/client";
import { COUNTRY_CODES, GOOGLE_FAVICON_URL } from "@dub/utils";
import { z } from "zod";
import { analyticsQuerySchema } from "./analytics";
import { analyticsResponse } from "./analytics-response";
import { createLinkBodySchema } from "./links";
import {
  base64ImageSchema,
  booleanQuerySchema,
  getPaginationQuerySchema,
  publicHostedImageSchema,
  storedR2ImageUrlSchema,
} from "./misc";
import { ProgramEnrollmentSchema } from "./programs";
import { parseUrlSchema } from "./utils";

export const PARTNERS_MAX_PAGE_SIZE = 100;

export const INACTIVE_ENROLLMENT_STATUSES: ProgramEnrollmentStatus[] = [
  "banned",
  "deactivated",
  "rejected",
];

export const exportPartnerColumns = [
  { id: "id", label: "ID", default: true },
  { id: "name", label: "Name", default: true },
  { id: "email", label: "Email", default: true },
  { id: "country", label: "Country", default: true },
  { id: "status", label: "Status", default: true },
  { id: "createdAt", label: "Enrolled at", default: true },
  {
    id: "payoutsEnabledAt",
    label: "Payouts enabled at",
    default: true,
    expanded: false,
  },
  { id: "description", label: "Description", default: false },
  { id: "totalClicks", label: "Clicks", default: false, numeric: true },
  { id: "totalLeads", label: "Leads", default: false, numeric: true },
  {
    id: "totalConversions",
    label: "Conversions",
    default: false,
    numeric: true,
  },
  { id: "totalSales", label: "Sales", default: false, numeric: true },
  { id: "totalSaleAmount", label: "Revenue", default: false, numeric: true },
  {
    id: "totalCommissions",
    label: "Commissions",
    default: false,
    expanded: true,
    numeric: true,
  },
  { id: "netRevenue", label: "Net Revenue", default: false, numeric: true },
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

export const exportApplicationColumns = [
  { id: "id", label: "ID" },
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "country", label: "Country" },
  { id: "createdAt", label: "Applied at" },
  { id: "description", label: "Description" },
  { id: "website", label: "Website" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter", label: "Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

export const exportApplicationsColumnsDefault = [
  "id",
  "name",
  "email",
  "country",
  "createdAt",
  "website",
  "youtube",
  "linkedin",
];

export const getPartnersQuerySchema = z
  .object({
    status: z
      .nativeEnum(ProgramEnrollmentStatus)
      .optional()
      .describe("A filter on the list based on the partner's `status` field.")
      .openapi({ example: "approved" }),
    country: z
      .string()
      .optional()
      .describe("A filter on the list based on the partner's `country` field.")
      .openapi({ example: "US" }),
    sortBy: z
      .enum([
        "createdAt",
        "totalClicks",
        "totalLeads",
        "totalConversions",
        "totalSaleAmount",
        "totalCommissions",
        "netRevenue",
        "earningsPerClick",
        "averageLifetimeValue",
        "clickToLeadRate",
        "clickToConversionRate",
        "leadToConversionRate",
        "returnOnAdSpend",
      ])
      .default("totalSaleAmount")
      .describe(
        "The field to sort the partners by. The default is `totalSaleAmount`.",
      )
      .openapi({ example: "totalSaleAmount" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("The sort order. The default is `desc`.")
      .openapi({ example: "desc" }),
    email: z
      .string()
      .optional()
      .describe(
        "Filter the partner list based on the partner's `email`. The value must be a string. Takes precedence over `search`.",
      )
      .openapi({ example: "panic@thedis.co" }),
    tenantId: z
      .string()
      .optional()
      .describe(
        "Filter the partner list based on the partner's `tenantId`. The value must be a string. Takes precedence over `email` and `search`.",
      )
      .openapi({ example: "1K0NM7HCN944PEMZ3CQPH43H8" }),
    search: z
      .string()
      .optional()
      .describe(
        "A search query to filter partners by ID, name, email, or link.",
      )
      .openapi({ example: "john" }),
  })
  .merge(getPaginationQuerySchema({ pageSize: PARTNERS_MAX_PAGE_SIZE }));

export const getPartnersQuerySchemaExtended = getPartnersQuerySchema.merge(
  z.object({
    partnerIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional(),
    groupId: z.string().optional(),
    includeOnlinePresenceVerification: booleanQuerySchema.optional(),
  }),
);

export const partnersExportQuerySchema = getPartnersQuerySchemaExtended
  .omit({ page: true, pageSize: true })
  .merge(
    z.object({
      columns: z
        .string()
        .default(exportPartnersColumnsDefault.join(","))
        .transform((v) => v.split(",")),
    }),
  );

export const partnersCountQuerySchema = getPartnersQuerySchemaExtended
  .omit({
    sortBy: true,
    sortOrder: true,
    page: true,
    pageSize: true,
  })
  .extend({
    groupBy: z.enum(["status", "country", "groupId"]).optional(),
  });

export const PartnerOnlinePresenceSchema = z.object({
  website: z
    .string()
    .nullish()
    .describe("The partner's website URL (including the https protocol)."),
  websiteTxtRecord: z.string().nullish(),
  websiteVerifiedAt: z.date().nullish(),
  youtube: z
    .string()
    .nullish()
    .describe("The partner's YouTube channel username (e.g. `johndoe`)."),
  youtubeVerifiedAt: z.date().nullish(),
  youtubeSubscriberCount: z.number().nullish(),
  youtubeViewCount: z.number().nullish(),
  twitter: z
    .string()
    .nullish()
    .describe("The partner's Twitter username (e.g. `johndoe`)."),
  twitterVerifiedAt: z.date().nullish(),
  linkedin: z
    .string()
    .nullish()
    .describe("The partner's LinkedIn username (e.g. `johndoe`)."),
  linkedinVerifiedAt: z.date().nullish(),
  instagram: z
    .string()
    .nullish()
    .describe("The partner's Instagram username (e.g. `johndoe`)."),
  instagramVerifiedAt: z.date().nullish(),
  tiktok: z
    .string()
    .nullish()
    .describe("The partner's TikTok username (e.g. `johndoe`)."),
  tiktokVerifiedAt: z.date().nullish(),
});

export const MAX_PARTNER_INDUSTRY_INTERESTS = 8;

export const PartnerProfileSchema = z.object({
  monthlyTraffic: z
    .nativeEnum(MonthlyTraffic)
    .nullable()
    .describe("The partner's monthly traffic."),
  industryInterests: z
    .array(z.nativeEnum(IndustryInterest))
    .max(MAX_PARTNER_INDUSTRY_INTERESTS)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate industry interests are not allowed.",
    })
    .describe("The partner's industry interests."),
  preferredEarningStructures: z
    .array(z.nativeEnum(PreferredEarningStructure))
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate preferred earning structures are not allowed.",
    })
    .describe("The partner's preferred earning structures."),
  salesChannels: z
    .array(z.nativeEnum(SalesChannel))
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate sales channels are not allowed.",
    })
    .describe("The partner's sales channels."),
});

export const MAX_PARTNER_DESCRIPTION_LENGTH = 500;

export const PartnerSchema = z
  .object({
    id: z.string().describe("The partner's unique ID on Dub."),
    name: z.string().max(190).describe("The partner's full legal name."),
    companyName: z
      .string()
      .max(190)
      .nullable()
      .describe(
        "If the partner profile type is a company, this is the partner's legal company name.",
      ),
    profileType: z
      .nativeEnum(PartnerProfileType)
      .describe("The partner's profile type on Dub."),
    email: z
      .string()
      .max(190)
      .nullable()
      .describe(
        "The partner's email address. Should be a unique value across Dub.",
      ),
    image: z.string().nullable().describe("The partner's avatar image."),
    description: z
      .string()
      .max(5000) // Left at 5000 instead of MAX_PARTNER_DESCRIPTION_LENGTH to avoid breaking changes
      .nullish()
      .describe("A brief description of the partner and their background."),
    country: z
      .string()
      .nullable()
      .describe("The partner's country (required for tax purposes)."),
    stripeConnectId: z
      .string()
      .nullable()
      .describe(
        "The partner's Stripe Connect ID (for receiving payouts via Stripe).",
      ),
    paypalEmail: z
      .string()
      .nullable()
      .describe(
        "The partner's PayPal email (for receiving payouts via PayPal).",
      ),
    payoutsEnabledAt: z
      .date()
      .nullable()
      .describe("The date when the partner enabled payouts."),
    invoiceSettings: z
      .object({
        address: z.string().nullish(),
        taxId: z.string().nullish(),
      })
      .nullable()
      .describe("The partner's invoice settings."),
    createdAt: z
      .date()
      .describe("The date when the partner was created on Dub."),
    discoverableAt: z
      .date()
      .nullable()
      .describe("The date when the partner was added to the partner network."),
    trustedAt: z
      .date()
      .nullable()
      .describe(
        "The date when the partner received the trusted badge in the partner network.",
      ),
  })
  .merge(PartnerOnlinePresenceSchema)
  .merge(PartnerProfileSchema.partial());

export const PartnerWithProfileSchema =
  PartnerSchema.merge(PartnerProfileSchema);

export const PartnerRewindSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  year: z.number(),
  totalClicks: z.number().default(0),
  totalLeads: z.number().default(0),
  totalRevenue: z.number().default(0),
  totalEarnings: z.number().default(0),
  clicksPercentile: z.number().default(0),
  leadsPercentile: z.number().default(0),
  revenuePercentile: z.number().default(0),
  earningsPercentile: z.number().default(0),
});

// Used externally by GET+POST /api/partners and partner.enrolled webhook
export const EnrolledPartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  companyName: true,
  email: true,
  image: true,
  description: true,
  country: true,
  paypalEmail: true,
  stripeConnectId: true,
  payoutsEnabledAt: true,
  trustedAt: true,
})
  .merge(
    ProgramEnrollmentSchema.omit({
      program: true,
      rewards: true,
      discount: true,
      group: true,
      customerDataSharingEnabledAt: true,
    }),
  )
  .extend({
    totalClicks: z
      .number()
      .default(0)
      .describe("The total number of clicks on the partner's links"),
    totalLeads: z
      .number()
      .default(0)
      .describe("The total number of leads generated by the partner's links"),
    totalConversions: z
      .number()
      .default(0)
      .describe("The total number of leads that converted to paying customers"),
    totalSales: z
      .number()
      .default(0)
      .describe(
        "The total number of sales generated by the partner's links (includes recurring sales)",
      ),
    totalSaleAmount: z
      .number()
      .default(0)
      .describe("Total revenue generated by the partner's links"),
    totalCommissions: z
      .number()
      .default(0)
      .describe(
        "The total commissions paid to the partner for their referrals",
      ),
    netRevenue: z
      .number()
      .default(0)
      .describe(
        "Net revenue after commissions (`Total Revenue - Total Commissions`)",
      ),
    earningsPerClick: z
      .number()
      .nullish()
      .describe("Earnings Per Click (EPC) (`Total Revenue ÷ Total Clicks`)"),
    averageLifetimeValue: z
      .number()
      .nullish()
      .describe(
        "Average lifetime value for each paying customer (`Total Revenue ÷ Total Conversions`)",
      ),
    clickToLeadRate: z
      .number()
      .nullish()
      .describe(
        "Percentage of clicks that become leads (`Total Leads ÷ Total Clicks`)",
      ),
    clickToConversionRate: z
      .number()
      .nullish()
      .describe(
        "Percentage of clicks that convert to paying customers (`Total Conversions ÷ Total Clicks`)",
      ),
    leadToConversionRate: z
      .number()
      .nullish()
      .describe(
        "Percentage of leads that convert to paying customers (`Total Conversions ÷ Total Leads`)",
      ),
    returnOnAdSpend: z
      .number()
      .nullish()
      .describe(
        "Return On Ad Spend (ROAS) (`Total Revenue ÷ Total Commissions`)",
      ),
  })
  .merge(
    PartnerOnlinePresenceSchema.pick({
      website: true,
      youtube: true,
      twitter: true,
      linkedin: true,
      instagram: true,
      tiktok: true,
    }),
  );

export const EnrolledPartnerSchemaExtended = EnrolledPartnerSchema.extend({
  lastLeadAt: z.date().nullish(),
  lastConversionAt: z.date().nullish(),
  customerDataSharingEnabledAt: z.date().nullish(),
}).merge(
  PartnerSchema.pick({
    monthlyTraffic: true,
    industryInterests: true,
    preferredEarningStructures: true,
    salesChannels: true,
  }).merge(PartnerOnlinePresenceSchema),
);

export const WebhookPartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  email: true,
  image: true,
  payoutsEnabledAt: true,
  country: true,
}).merge(
  z.object({
    groupId: z.string().nullish(),
    totalClicks: z.number(),
    totalLeads: z.number(),
    totalConversions: z.number(),
    totalSales: z.number(),
    totalSaleAmount: z.number(),
    totalCommissions: z.number(),
  }),
);

export const LeaderboardPartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  totalCommissions: z.number().default(0),
});

export const createPartnerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .describe(
      "The partner's full name. If undefined, the partner's email will be used in lieu of their name (e.g. `john@acme.com`)",
    ),
  email: z
    .string()
    .trim()
    .min(1)
    .max(190)
    .email()
    .describe(
      "The partner's email address. Partners will be able to claim their profile by signing up at `partners.dub.co` with this email.",
    ),
  username: z
    .string()
    .max(100)
    .nullish()
    .describe(
      "The partner's unique username in your system (max 100 characters). This will be used to create a short link for the partner using your program's default domain. If not provided, Dub will try to generate a username from the partner's name or email.",
    ),
  image: z
    .string()
    .nullish()
    .describe(
      "The partner's avatar image. If not provided, a default avatar will be used.",
    ),
  tenantId: z
    .string()
    .optional()
    .describe(
      "The partner's unique ID in your system. Useful for retrieving the partner's links and stats later on. If not provided, the partner will be created as a standalone partner.",
    ),
  groupId: z
    .string()
    .optional()
    .describe(
      "The group ID to add the partner to. If not provided, the partner will be added to the default group.",
    ),
  country: z
    .string()
    .nullish()
    .describe(
      "The partner's country of residence. Must be passed as a 2-letter ISO 3166-1 country code. See https://d.to/geo for more information.",
    ),
  description: z
    .string()
    .max(5000)
    .nullish()
    .describe(
      "A brief description of the partner and their background. Max 5,000 characters.",
    ),
  linkProps: createLinkBodySchema
    .omit({
      url: true,
      domain: true,
      key: true,
      // default programId / partnerId fields
      programId: true,
      partnerId: true,
      // partner links always track conversions
      trackConversion: true,
      // folderId is set to the program's defaultFolderId
      folderId: true,
      // UTM params are derived from the partner's group settings
      utm_source: true,
      utm_medium: true,
      utm_campaign: true,
      utm_term: true,
      utm_content: true,
      ref: true,
      // additional unsupported fields
      publicStats: true,
      tagId: true,
      geo: true,
      webhookIds: true,
    })
    .partial()
    .optional()
    .describe(
      "Additional properties that you can pass to the partner's short link. Will be used to override the default link properties for this partner.",
    ),
});

// This is a temporary fix to allow arbitrary image URL
// TODO: Fix this by using file-type
const partnerImageSchema = z
  .union([
    base64ImageSchema,
    storedR2ImageUrlSchema,
    publicHostedImageSchema,
    z
      .string()
      .url()
      .trim()
      .refine((url) => url.startsWith(GOOGLE_FAVICON_URL), {
        message: `Image URL must start with ${GOOGLE_FAVICON_URL}`,
      }),
  ])
  .transform((v) => v || "")
  .refine((v) => v !== "", {
    message: "Image is required",
  });

export const onboardPartnerSchema = createPartnerSchema
  .omit({
    username: true,
    email: true,
    linkProps: true,
  })
  .merge(
    z.object({
      name: z.string().min(1, "Name is required"),
      image: partnerImageSchema,
      country: z.enum(COUNTRY_CODES),
      profileType: z.nativeEnum(PartnerProfileType).default("individual"),
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

export const partnerIdTenantIdSchema = z.object({
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
});

export const createPartnerLinkSchema = partnerIdTenantIdSchema
  .extend({
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
    query: true,
  })
  .merge(partnerIdTenantIdSchema)
  .merge(
    z.object({
      groupBy: z
        .enum(["top_links", "timeseries", "count"])
        .default("count")
        .describe(
          "The parameter to group the analytics data points by. Defaults to `count` if undefined.",
        ),
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

export const invitePartnerSchema = z.object({
  workspaceId: z.string(),
  name: z.string().max(100).optional(),
  email: z.string().trim().email().min(1).max(100),
  username: z.string().max(100).optional(),
  groupId: z.string().nullish().default(null),
});

export const approvePartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  groupId: z.string().nullish(),
});

export const bulkApprovePartnersSchema = z.object({
  workspaceId: z.string(),
  groupId: z.string().nullish().default(null),
  partnerIds: z
    .array(z.string())
    .max(100)
    .min(1)
    .transform((v) => [...new Set(v)]),
});

export const rejectPartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  reportFraud: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to report this partner for suspected fraud to help keep the network safe.",
    ),
});

export const bulkRejectPartnersSchema = z.object({
  workspaceId: z.string(),
  partnerIds: z
    .array(z.string())
    .max(100)
    .min(1)
    .transform((v) => [...new Set(v)]),
  reportFraud: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to report these partners for suspected fraud to help keep the network safe.",
    ),
});

export const retrievePartnerLinksSchema = partnerIdTenantIdSchema;

export const banPartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  reason: z.enum(
    Object.keys(BAN_PARTNER_REASONS) as [
      PartnerBannedReason,
      ...PartnerBannedReason[],
    ],
  ),
});

export const banPartnerApiSchema = partnerIdTenantIdSchema.merge(
  banPartnerSchema.pick({ reason: true }),
);

export const bulkBanPartnersSchema = z.object({
  workspaceId: z.string(),
  partnerIds: z
    .array(z.string())
    .max(100)
    .min(1)
    .transform((v) => [...new Set(v)]),
  reason: z.enum(
    Object.keys(BAN_PARTNER_REASONS) as [
      PartnerBannedReason,
      ...PartnerBannedReason[],
    ],
  ),
});

export const deactivatePartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

export const archivePartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

export const bulkArchivePartnersSchema = z.object({
  workspaceId: z.string(),
  partnerIds: z
    .array(z.string())
    .max(100)
    .min(1)
    .transform((v) => [...new Set(v)]),
});

export const partnerPayoutSettingsSchema = z.object({
  companyName: z.string().max(190).trim().nullish(),
  address: z.string().max(500).trim().nullish(),
  taxId: z.string().max(100).trim().nullish(),
});

export const partnerCrossProgramSummarySchema = z.object({
  totalPrograms: z.number(),
  trustedPrograms: z.number(),
  removedPrograms: z.number(),
});

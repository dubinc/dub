import { isValidDomainFormat } from "@/lib/api/domains/is-valid-domain";
import { RESOURCE_COLORS } from "@/ui/colors";
import { PartnerLinkStructure } from "@dub/prisma/client";
import { validSlugRegex } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";
import { DiscountSchema } from "./discount";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { programApplicationFormSchema } from "./program-application-form";
import { programLanderSchema } from "./program-lander";
import { RewardSchema } from "./rewards";
import { parseUrlSchema } from "./utils";
import { UTMTemplateSchema } from "./utm";

export const DEFAULT_PARTNER_GROUP = {
  name: "Default Group",
  slug: "default",
  color: null,
} as const;

// max number of partnerGroupDefaultLinks per group
export const MAX_DEFAULT_LINKS_PER_GROUP = 5;

// for the maxPartnerLinks setting (alongside additionalLinks)
export const DEFAULT_ADDITIONAL_PARTNER_LINKS = 10;
export const MAX_ADDITIONAL_PARTNER_LINKS = 100;

export const GROUPS_MAX_PAGE_SIZE = 100;

export const additionalPartnerLinkSchema = z.object({
  domain: z
    .string()
    .refine((v) => isValidDomainFormat(v), {
      message: "Please enter a valid domain (eg: acme.com).",
    })
    .transform((v) => v.toLowerCase()),
  path: z
    .string()
    .transform((v) => v.toLowerCase())
    .optional()
    .default(""),
  validationMode: z.enum([
    "domain", // domain match (e.g. if URL is example.com/path, example.com and example.com/another-path are allowed)
    "exact", // exact match (e.g. if URL is example.com/path, only example.com/path is allowed)
  ]),
});

export const additionalPartnerLinkSchemaOptionalPath =
  additionalPartnerLinkSchema.extend({
    path: z.string().optional(),
  });

// This is the standard response we send for all /api/groups/** endpoints
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  clickReward: RewardSchema.nullish(),
  leadReward: RewardSchema.nullish(),
  saleReward: RewardSchema.nullish(),
  discount: DiscountSchema.nullish(),
  utmTemplate: UTMTemplateSchema.nullish(),
  additionalLinks: z.array(additionalPartnerLinkSchema).nullable(),
  maxPartnerLinks: z.number(),
  linkStructure: z.nativeEnum(PartnerLinkStructure),
});

export const GroupWithFormDataSchema = GroupSchema.extend({
  applicationFormData: programApplicationFormSchema.nullable(),
  applicationFormPublishedAt: z.date().nullable(),
  landerData: programLanderSchema.nullable(),
  landerPublishedAt: z.date().nullable(),
});

export const GroupSchemaExtended = GroupSchema.extend({
  totalPartners: z.number().default(0),
  totalClicks: z.number().default(0),
  totalLeads: z.number().default(0),
  totalSales: z.number().default(0),
  totalSaleAmount: z.number().default(0),
  totalConversions: z.number().default(0),
  totalCommissions: z.number().default(0),
  netRevenue: z.number().default(0),
});

export const createOrUpdateDefaultLinkSchema = z.object({
  domain: z.string(),
  url: parseUrlSchema,
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(190, "Name is too long. Max 190 characters"),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(
      (val) => {
        const trimmed = val.trim();
        return validSlugRegex.test(trimmed) && !/^grp_/i.test(trimmed);
      },
      {
        message: "Invalid slug format.",
      },
    )
    .transform((val) => slugify(val)),
  color: z.enum(RESOURCE_COLORS).nullable(),
});

export const updateGroupSchema = createGroupSchema.partial().extend({
  additionalLinks: z
    .array(additionalPartnerLinkSchema)
    .max(MAX_ADDITIONAL_PARTNER_LINKS)
    .optional(),
  maxPartnerLinks: z.number().optional(),
  utmTemplateId: z.string().optional(),
  linkStructure: z.nativeEnum(PartnerLinkStructure).optional(),
  applicationFormData: programApplicationFormSchema.optional(),
  landerData: programLanderSchema.optional(),
});

export const PartnerGroupDefaultLinkSchema = z.object({
  id: z.string(),
  domain: z.string(),
  url: parseUrlSchema,
});

export const getGroupsQuerySchema = z
  .object({
    search: z.string().optional(),
    groupIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional(),
    sortBy: z
      .enum([
        "createdAt",
        "totalPartners",
        "totalClicks",
        "totalLeads",
        "totalSales",
        "totalSaleAmount",
        "totalConversions",
        "totalCommissions",
        // "netRevenue", // TODO: add back when we can sort by this again
      ])
      .default("totalSaleAmount"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    includeExpandedFields: booleanQuerySchema.optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: GROUPS_MAX_PAGE_SIZE }));

export const getGroupsCountQuerySchema = z.object({
  search: z.string().optional(),
});

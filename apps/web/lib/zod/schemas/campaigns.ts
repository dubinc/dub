import { CampaignStatus, CampaignType } from "@dub/prisma/client";
import { z } from "zod";
import { GroupSchema } from "./groups";
import { workflowConditionSchema } from "./workflows";

export const ALLOWED_ATTRIBUTE_VALUES_IN_DAYS = [0, 1, 3, 7, 14, 30] as const;

export const EMAIL_TEMPLATE_VARIABLES = {
  partnerName: "PartnerName",
  partnerEmail: "PartnerEmail",
} as const;

export const EMAIL_TEMPLATE_VARIABLE_KEYS = Object.keys(
  EMAIL_TEMPLATE_VARIABLES,
);

export const EMAIL_TEMPLATE_VARIABLE_LABELS = Object.values(
  EMAIL_TEMPLATE_VARIABLES,
);

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  type: z.nativeEnum(CampaignType),
  status: z.nativeEnum(CampaignStatus),
  triggerCondition: workflowConditionSchema.nullable().default(null),
  groups: z.array(GroupSchema.pick({ id: true })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// GET /api/campaigns
export const CampaignListSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(CampaignType),
  status: z.nativeEnum(CampaignStatus),
  partners: z.number(),
  delivered: z.number(),
  bounced: z.number(),
  opened: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const campaignTypeSchema = z.nativeEnum(CampaignType);

export const createCampaignSchema = z.object({
  groupIds: z.array(z.string()).nullish().default(null),
  type: campaignTypeSchema,
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be less than 100 characters."),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required.")
    .max(100, "Subject must be less than 100 characters."),
  body: z.string().min(1, "Body is required."),
  triggerCondition: workflowConditionSchema.nullish(),
});

export const updateCampaignSchema = createCampaignSchema
  .omit({ type: true })
  .partial();

export const getCampaignsQuerySchema = z.object({
  type: z.nativeEnum(CampaignType).optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "status"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});

export const getCampaignsCountQuerySchema = getCampaignsQuerySchema
  .pick({
    type: true,
    status: true,
    search: true,
  })
  .extend({
    groupBy: z.enum(["type", "status"]).optional(),
  });

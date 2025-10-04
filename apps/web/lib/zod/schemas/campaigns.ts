import { CampaignWorkflowAttribute } from "@/lib/types";
import { CampaignStatus, CampaignType } from "@dub/prisma/client";
import { z } from "zod";
import { GroupSchema } from "./groups";
import { getPaginationQuerySchema } from "./misc";
import { workflowConditionSchema } from "./workflows";

export const ALLOWED_ATTRIBUTE_VALUES_IN_DAYS = [0, 1, 3, 7, 14, 30];

export const EMAIL_TEMPLATE_VARIABLES = ["PartnerName", "PartnerEmail"];

export const CAMPAIGN_WORKFLOW_ATTRIBUTES = ["partnerEnrolledDays"] as const;

export const CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS: Record<
  CampaignWorkflowAttribute,
  string
> = {
  partnerEnrolledDays: "been in the program for",
} as const;

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

export const createCampaignSchema = z.object({
  type: z.nativeEnum(CampaignType),
});

export const updateCampaignSchema = z
  .object({
    type: z.nativeEnum(CampaignType),
    name: z.string().trim().max(100, "Name must be less than 100 characters."),
    subject: z
      .string()
      .trim()
      .max(100, "Subject must be less than 100 characters."),
    body: z.string(),
    triggerCondition: workflowConditionSchema.nullish(),
    groupIds: z.array(z.string()).nullable(),
    status: z.enum([
      CampaignStatus.draft,
      CampaignStatus.active,
      CampaignStatus.paused,
    ]),
  })
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

export const getCampaignsEventsQuerySchema = z
  .object({
    status: z.enum(["opened", "bounced"]).default("opened"),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

const metricSchema = z.object({
  count: z.coerce.number(),
  percent: z.coerce.number().min(0).max(100),
});

export const campaignSummarySchema = z.object({
  sent: metricSchema,
  delivered: metricSchema,
  opened: metricSchema,
  bounced: metricSchema,
});

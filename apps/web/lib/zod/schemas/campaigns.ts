import {
  CampaignWorkflowAttributeConfig,
  WorkflowAttribute,
} from "@/lib/types";
import {
  CampaignStatus,
  CampaignType,
  WorkflowTrigger,
} from "@dub/prisma/client";
import { z } from "zod";
import { GroupSchema } from "./groups";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { workflowConditionSchema } from "./workflows";

export const EMAIL_TEMPLATE_VARIABLES = [
  "PartnerName",
  "PartnerEmail",
] as const;

export const CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG: Record<
  WorkflowAttribute,
  CampaignWorkflowAttributeConfig
> = {
  totalClicks: {
    label: "clicks",
    inputType: "number",
  },
  totalLeads: {
    label: "leads",
    inputType: "number",
  },
  totalConversions: {
    label: "conversions",
    inputType: "number",
  },
  totalSales: {
    label: "sales",
    inputType: "number",
  },
  totalSaleAmount: {
    label: "revenue",
    inputType: "currency",
  },
  totalCommissions: {
    label: "commissions",
    inputType: "currency",
  },
  partnerEnrolledDays: {
    label: "enrollment duration",
    inputType: "dropdown",
    dropdownValues: [1, 3, 7, 14, 30],
  },
  partnerJoined: {
    label: "joins the program",
    inputType: "none",
  },
};

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  bodyJson: z.record(z.string(), z.any()),
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
  delivered: z.number(),
  sent: z.number(),
  bounced: z.number(),
  opened: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  groups: z.array(GroupSchema.pick({ id: true })),
});

export const createCampaignSchema = z.object({
  type: z.nativeEnum(CampaignType),
});

export const updateCampaignSchema = z
  .object({
    name: z.string().trim().max(100, "Name must be less than 100 characters."),
    subject: z
      .string()
      .trim()
      .max(100, "Subject must be less than 100 characters."),
    bodyJson: z.record(z.string(), z.any()),
    triggerCondition: workflowConditionSchema.nullish(),
    groupIds: z.array(z.string()).nullable(),
    status: z.enum([
      CampaignStatus.draft,
      CampaignStatus.active,
      CampaignStatus.paused,
    ]),
  })
  .partial();

export const getCampaignsQuerySchema = z
  .object({
    type: z.nativeEnum(CampaignType).optional(),
    status: z.nativeEnum(CampaignStatus).optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "status",
        "sent",
        "delivered",
        "opened",
        "bounced",
      ])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    search: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

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
    status: z.enum(["delivered", "opened", "bounced"]).default("delivered"),
    search: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const getCampaignEventsCountQuerySchema =
  getCampaignsEventsQuerySchema.pick({
    status: true,
    search: true,
  });

export const campaignSummarySchema = z.object({
  sent: z.coerce.number(),
  delivered: z.coerce.number(),
  opened: z.coerce.number(),
  bounced: z.coerce.number(),
});

export const campaignEventSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  openedAt: z.date().nullable(),
  bouncedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    image: true,
  }),
  group: GroupSchema.pick({
    id: true,
    name: true,
    color: true,
  }),
});

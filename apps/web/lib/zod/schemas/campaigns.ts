import { CampaignStatus, CampaignType } from "@prisma/client";
import * as z from "zod/v4";
import { sendCampaignConditionSchema } from "../../api/workflows/send-campaign/schema";
import { GroupSchema } from "./groups";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { parseDateSchema } from "./utils";

export const EMAIL_TEMPLATE_VARIABLES = [
  "PartnerName",
  "PartnerEmail",
  "PartnerLink",
] as const;

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  preview: z.string().nullable().default(null),
  from: z.string().nullable(),
  bodyJson: z.record(z.string(), z.any()),
  type: z.enum(CampaignType),
  status: z.enum(CampaignStatus),
  triggerCondition: sendCampaignConditionSchema.nullable().default(null),
  groups: z.array(GroupSchema.pick({ id: true })),
  scheduledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// GET /api/campaigns
export const CampaignListSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(CampaignType),
  status: z.enum(CampaignStatus),
  scheduledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  groups: z.array(GroupSchema.pick({ id: true })),
});

export const createCampaignSchema = z.object({
  type: z.enum(CampaignType),
});

export const updateCampaignSchema = z
  .object({
    name: z.string().trim().max(100, "Name must be less than 100 characters."),
    subject: z
      .string()
      .trim()
      .max(100, "Subject must be less than 100 characters."),
    preview: z.string().nullish(),
    from: z.email().trim().toLowerCase(),
    bodyJson: z.record(z.string(), z.any()),
    triggerCondition: sendCampaignConditionSchema.nullish(),
    groupIds: z.array(z.string()).nullable(),
    scheduledAt: parseDateSchema.nullish(),
    status: z.enum([
      CampaignStatus.draft,
      CampaignStatus.active,
      CampaignStatus.paused,
      CampaignStatus.scheduled,
      CampaignStatus.canceled,
    ]),
  })
  .partial();

export const getCampaignsQuerySchema = z
  .object({
    type: z.enum(CampaignType).optional(),
    status: z.enum(CampaignStatus).optional(),
    search: z.string().optional(),
    triggerCondition: z
      .string()
      .pipe(
        z.preprocess(
          (input: string) => JSON.parse(input),
          sendCampaignConditionSchema,
        ),
      )
      .optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

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
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

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
  }).nullish(), // group can be null for partners that are banned/deactivated
});

import { WorkflowTrigger } from "@prisma/client";
import * as z from "zod/v4";

export const WORKFLOW_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
  "partnerEnrolledDays",
  "partnerJoined",
] as const;

type WorkflowConditionAttribute = (typeof WORKFLOW_ATTRIBUTES)[number];

export const WORKFLOW_ATTRIBUTE_TRIGGER: Record<
  WorkflowConditionAttribute,
  WorkflowTrigger
> = {
  totalLeads: WorkflowTrigger.partnerMetricsUpdated,
  totalConversions: WorkflowTrigger.partnerMetricsUpdated,
  totalSaleAmount: WorkflowTrigger.partnerMetricsUpdated,
  totalCommissions: WorkflowTrigger.partnerMetricsUpdated,
  partnerEnrolledDays: WorkflowTrigger.partnerEnrolled,
  partnerJoined: WorkflowTrigger.partnerEnrolled,
} as const;

export const WORKFLOW_COMPARISON_OPERATORS = ["gte", "between"] as const;

export const SCHEDULED_WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
  "partnerEnrolled",
];

export const WORKFLOW_SCHEDULES: Partial<Record<WorkflowTrigger, string>> = {
  partnerEnrolled: "0 */12 * * *", // every 12 hours
};

export enum WORKFLOW_ACTION_TYPES {
  AwardBounty = "awardBounty",
  SendCampaign = "sendCampaign",
  MoveGroup = "moveGroup",
}

export const WORKFLOW_LOGICAL_OPERATORS = ["AND"] as const;

// Individual condition
export const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_ATTRIBUTES),
  operator: z.enum(WORKFLOW_COMPARISON_OPERATORS).default("gte"),
  value: z.union([
    z.number(),
    z.object({
      min: z.number(),
      max: z.number(),
    }),
  ]),
});

// Array of conditions with AND operator
export const workflowConditionsSchema = z.object({
  operator: z.enum(WORKFLOW_LOGICAL_OPERATORS).default("AND"),
  conditions: z.array(workflowConditionSchema).min(1),
});

// Individual action
export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(WORKFLOW_ACTION_TYPES.AwardBounty),
    data: z.object({
      bountyId: z.string(),
    }),
  }),

  z.object({
    type: z.literal(WORKFLOW_ACTION_TYPES.SendCampaign),
    data: z.object({
      campaignId: z.string(),
    }),
  }),

  z.object({
    type: z.literal(WORKFLOW_ACTION_TYPES.MoveGroup),
    data: z.object({
      groupId: z.string(),
    }),
  }),
]);

// Array of actions (Only supports one action for now)
export const workflowActionsSchema = z.array(workflowActionSchema);

export const createWorkflowSchema = z.object({
  trigger: z.enum(WorkflowTrigger),
  triggerConditions: workflowConditionsSchema,
  actions: workflowActionsSchema,
});

export const workflowSchema = z.object({
  name: z.string(),
  trigger: z.enum(WorkflowTrigger),
  triggerConditions: workflowConditionsSchema,
  actions: workflowActionsSchema,
});

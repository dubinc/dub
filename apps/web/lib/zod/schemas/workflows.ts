import {
  OperatorFn,
  WorkflowComparisonOperator,
  WorkflowConditionAttribute,
} from "@/lib/types";
import { WorkflowTrigger } from "@dub/prisma/client";
import * as z from "zod/v4";

export const WORKFLOW_ATTRIBUTES = [
  // "totalClicks",
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
  "partnerEnrolledDays",
  "partnerJoined",
] as const;

export const WORKFLOW_ATTRIBUTE_TRIGGER: Record<
  WorkflowConditionAttribute,
  WorkflowTrigger
> = {
  // totalClicks: WorkflowTrigger.clickRecorded,
  totalLeads: WorkflowTrigger.leadRecorded,
  totalConversions: WorkflowTrigger.saleRecorded,
  totalSaleAmount: WorkflowTrigger.saleRecorded,
  totalCommissions: WorkflowTrigger.commissionEarned,
  partnerEnrolledDays: WorkflowTrigger.partnerEnrolled,
  partnerJoined: WorkflowTrigger.partnerEnrolled,
} as const;

export const WORKFLOW_COMPARISON_OPERATORS = ["gte"] as const;

export const SCHEDULED_WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
  // "clickRecorded",
  "partnerEnrolled",
];

export const WORKFLOW_SCHEDULES: Partial<Record<WorkflowTrigger, string>> = {
  // clickRecorded: "*/5 * * * *", // every 5 minutes
  partnerEnrolled: "0 */12 * * *", // every 12 hours
};

export const OPERATOR_FUNCTIONS: Record<
  WorkflowComparisonOperator,
  OperatorFn
> = {
  gte: (a, b) => a >= b,
};

export const WORKFLOW_COMPARISON_OPERATOR_LABELS: Record<
  WorkflowComparisonOperator,
  string
> = {
  gte: "more than",
} as const;

export enum WORKFLOW_ACTION_TYPES {
  AwardBounty = "awardBounty",
  SendCampaign = "sendCampaign",
}

export const WORKFLOW_LOGICAL_OPERATORS = ["AND"] as const;

// Individual condition
export const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_ATTRIBUTES),
  operator: z.enum(WORKFLOW_COMPARISON_OPERATORS).default("gte"),
  value: z.number(),
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

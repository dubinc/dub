import {
  OperatorFn,
  WorkflowComparisonOperator,
  WorkflowConditionAttribute,
} from "@/lib/types";
import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

export const WORKFLOW_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommission",
] as const;

export const WORKFLOW_ATTRIBUTE_LABELS: Record<
  WorkflowConditionAttribute,
  string
> = {
  totalLeads: "total leads",
  totalConversions: "total conversions",
  totalSaleAmount: "total sale amount",
  totalCommission: "total commission",
} as const;

export const WORKFLOW_ATTRIBUTE_TRIGGER_MAP: Record<
  WorkflowConditionAttribute,
  WorkflowTrigger
> = {
  totalLeads: WorkflowTrigger.leadRecorded,
  totalConversions: WorkflowTrigger.saleRecorded,
  totalSaleAmount: WorkflowTrigger.saleRecorded,
  totalCommission: WorkflowTrigger.commissionEarned,
} as const;

export const WORKFLOW_COMPARISON_OPERATORS = ["gte"] as const;

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
  SendEmail = "sendEmail",
  MoveToGroup = "moveToGroup",
  AwardBounty = "awardBounty",
  TriggerWebhook = "triggerWebhook",
}

export const WORKFLOW_LOGICAL_OPERATORS = ["AND"] as const;

// Individual condition
export const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_ATTRIBUTES),
  operator: z.enum(WORKFLOW_COMPARISON_OPERATORS),
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
    type: z.literal("sendEmail"),
    data: z.object({
      emailId: z.string(),
    }),
  }),

  z.object({
    type: z.literal("moveToGroup"),
    data: z.object({
      groupId: z.string(),
    }),
  }),

  z.object({
    type: z.literal("awardBounty"),
    data: z.object({
      bountyId: z.string(),
    }),
  }),

  z.object({
    type: z.literal("triggerWebhook"),
    data: z.object({
      webhookId: z.string(),
    }),
  }),
]);

// Array of actions (Only supports one action for now)
export const workflowActionsSchema = z.array(workflowActionSchema);

export const createWorkflowSchema = z.object({
  trigger: z.nativeEnum(WorkflowTrigger),
  triggerConditions: workflowConditionsSchema,
  actions: workflowActionsSchema,
});

export const workflowSchema = z.object({
  name: z.string(),
  trigger: z.nativeEnum(WorkflowTrigger),
  triggerConditions: workflowConditionsSchema,
  actions: workflowActionsSchema,
});

import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

export const WORKFLOW_CONDITION_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommission",
] as const;

export const WORKFLOW_ACTION_TYPES = [
  "sendEmail",
  "moveToGroup",
  "awardBounty",
  "triggerWebhook",
] as const;

export const WORKFLOW_COMPARISON_OPERATORS = ["gte"] as const;

export const WORKFLOW_LOGICAL_OPERATORS = ["AND"] as const;

// Individual condition
const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_CONDITION_ATTRIBUTES),
  operator: z.enum(WORKFLOW_COMPARISON_OPERATORS),
  value: z.union([z.string(), z.number()]),
});

// Array of conditions with AND operator
export const workflowConditionsSchema = z.object({
  operator: z.enum(WORKFLOW_LOGICAL_OPERATORS).default("AND"),
  conditions: z.array(workflowConditionSchema).min(1),
});

// Individual action
const workflowActionSchema = z.discriminatedUnion("type", [
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

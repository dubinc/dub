import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

export const WORKFLOW_CONDITION_ATTRIBUTES = [
  "totalClicks",
  "totalLeads",
  "totalSales",
  "totalClickEarnings",
  "totalLeadEarnings",
  "totalSaleEarnings",
  "totalSaleRevenue",
  "totalEarnings",
  "totalRevenue",
] as const;

export const WORKFLOW_CONDITION_OPERATORS = ["gte"] as const;

export const WORKFLOW_ACTION_TYPES = [
  "awardBounty",
  // "moveToGroup",
  // "sendEmail",
  // "triggerWebhook",
] as const;

// Individual condition
const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_CONDITION_ATTRIBUTES),
  operator: z.enum(WORKFLOW_CONDITION_OPERATORS),
  value: z.union([z.string(), z.number()]),
});

// Array of conditions with AND operator
export const workflowConditionsSchema = z.object({
  operator: z.enum(["AND"]).default("AND"),
  conditions: z.array(workflowConditionSchema).min(1),
});

// Individual action
const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("awardBounty"),
    data: z.object({
      bountyId: z.string(),
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

import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

// WIP(kiran)

export const WORKFLOW_CONDITION_ATTRIBUTES = [
  "clicks",
  "leads",
  "sales",
  "click_earnings",
  "lead_earnings",
  "sale_earnings",
  "sale_revenue",
  "earnings",
  "revenue",
] as const;

export const WORKFLOW_CONDITION_OPERATORS = ["greater_than"] as const;

export const WORKFLOW_ACTION_TYPES = [
  "create_commission",
  "move_group",
  "send_email",
  "send_webhook",
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
    type: z.literal("create_commission"),
    data: z.object({
      bountyId: z.string(),
    }),
  }),

  z.object({
    type: z.literal("move_group"),
    data: z.object({
      newGroupId: z.string(),
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

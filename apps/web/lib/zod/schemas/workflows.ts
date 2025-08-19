import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

// WIP(kiran)

export const WORKFLOW_CONDITION_ATTRIBUTES = [
  "clicks",
  "leads",
  "sales",
  "clicks_earning",
  "leads_earning",
  "sales_earning",
  "sale_revenue",
  "earnings",
  "revenue",
] as const;

export const WORKFLOW_CONDITION_OPERATORS = [
  "equals_to",
  "not_equals",
  "starts_with",
  "ends_with",
  "in",
  "not_in",
] as const;

export const WORKFLOW_ACTION_TYPES = [
  "create_commission",
  "move_group",
  "send_email",
  "send_webhook",
] as const;

const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_CONDITION_ATTRIBUTES),
  operator: z.enum(WORKFLOW_CONDITION_OPERATORS),
  value: z.union([z.string(), z.number()]),
});

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

export const createWorkflowSchema = z.object({
  trigger: z.nativeEnum(WorkflowTrigger),
  triggerConditions: z.array(workflowConditionSchema),
  actions: z.array(workflowActionSchema),
});

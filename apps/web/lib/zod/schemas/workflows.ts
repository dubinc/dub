import {
  OperatorFn,
  WorkflowComparisonOperator,
  WorkflowConditionAttribute,
} from "@/lib/types";
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

// Partner profile attributes (only supported by group move rules for now)
export const WORKFLOW_PROFILE_ATTRIBUTES = ["groupId"] as const;

export const WORKFLOW_CONDITION_ATTRIBUTES = [
  ...WORKFLOW_ATTRIBUTES,
  ...WORKFLOW_PROFILE_ATTRIBUTES,
] as const;

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
  groupId: WorkflowTrigger.partnerMetricsUpdated,
} as const;

export const WORKFLOW_NUMERIC_COMPARISON_OPERATORS = [
  "gte",
  "between",
] as const;

export const WORKFLOW_ENUM_COMPARISON_OPERATORS = [
  "equals_to",
  "not_equals",
  "in",
  "not_in",
] as const;

export const WORKFLOW_COMPARISON_OPERATORS = [
  ...WORKFLOW_NUMERIC_COMPARISON_OPERATORS,
  ...WORKFLOW_ENUM_COMPARISON_OPERATORS,
] as const;

export const SCHEDULED_WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
  "partnerEnrolled",
];

export const WORKFLOW_SCHEDULES: Partial<Record<WorkflowTrigger, string>> = {
  partnerEnrolled: "0 */12 * * *", // every 12 hours
};

export const OPERATOR_FUNCTIONS: Record<
  WorkflowComparisonOperator,
  OperatorFn
> = {
  gte: (aV, cV) => {
    if (typeof aV !== "number" || typeof cV !== "number") {
      return false;
    }

    return aV >= cV;
  },
  between: (aV, cV) => {
    if (
      typeof aV !== "number" ||
      typeof cV !== "object" ||
      cV === null ||
      Array.isArray(cV)
    ) {
      return false;
    }

    const { min, max } = cV;

    if (min == null || max == null) {
      return false;
    }

    return aV >= min && aV <= max;
  },
  equals_to: (aV, cV) => typeof cV === "string" && aV === cV,
  not_equals: (aV, cV) => typeof cV === "string" && aV !== cV,
  in: (aV, cV) =>
    Array.isArray(cV) && typeof aV === "string" && cV.includes(aV),
  not_in: (aV, cV) =>
    Array.isArray(cV) && typeof aV === "string" && !cV.includes(aV),
};

export const WORKFLOW_COMPARISON_OPERATOR_LABELS: Record<
  WorkflowComparisonOperator,
  string
> = {
  gte: "more than",
  between: "between",
  equals_to: "is",
  not_equals: "is not",
  in: "is one of",
  not_in: "is not one of",
} as const;

export enum WORKFLOW_ACTION_TYPES {
  AwardBounty = "awardBounty",
  SendCampaign = "sendCampaign",
  MoveGroup = "moveGroup",
}

export const WORKFLOW_LOGICAL_OPERATORS = ["AND"] as const;

// Individual condition
export const workflowConditionSchema = z
  .object({
    attribute: z.enum(WORKFLOW_CONDITION_ATTRIBUTES),
    operator: z.enum(WORKFLOW_COMPARISON_OPERATORS).default("gte"),
    value: z.union([
      z.number(),
      z.object({
        min: z.number(),
        max: z.number(),
      }),
      z.string(),
      z.array(z.string()).min(1),
    ]),
  })
  .superRefine((condition, ctx) => {
    const { attribute, operator, value } = condition;

    if (attribute === "groupId") {
      if (
        !WORKFLOW_ENUM_COMPARISON_OPERATORS.includes(
          operator as (typeof WORKFLOW_ENUM_COMPARISON_OPERATORS)[number],
        )
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Operator ${operator} is not supported for the ${attribute} attribute.`,
        });
      } else if (
        ["equals_to", "not_equals"].includes(operator) &&
        typeof value !== "string"
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Value must be a string for the ${operator} operator.`,
        });
      } else if (["in", "not_in"].includes(operator) && !Array.isArray(value)) {
        ctx.addIssue({
          code: "custom",
          message: `Value must be an array for the ${operator} operator.`,
        });
      }

      return;
    }

    if (
      !WORKFLOW_NUMERIC_COMPARISON_OPERATORS.includes(
        operator as (typeof WORKFLOW_NUMERIC_COMPARISON_OPERATORS)[number],
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Operator ${operator} is not supported for the ${attribute} attribute.`,
      });
    } else if (operator === "gte" && typeof value !== "number") {
      ctx.addIssue({
        code: "custom",
        message: `Value must be a number for the ${operator} operator.`,
      });
    } else if (
      operator === "between" &&
      (typeof value !== "object" || value === null || Array.isArray(value))
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Value must be a { min, max } object for the ${operator} operator.`,
      });
    }
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

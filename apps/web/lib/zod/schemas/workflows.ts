import { WORKFLOW_ATTRIBUTE_KEYS } from "@/lib/api/workflows/attribute-definitions";
import {
  WORKFLOW_OPERATOR_KEYS,
  WORKFLOW_OPERATORS,
} from "@/lib/api/workflows/operator-definitions";
import * as z from "zod/v4";

export enum WORKFLOW_ACTION_TYPES {
  AwardBounty = "awardBounty",
  SendCampaign = "sendCampaign",
  MoveGroup = "moveGroup",
}

// Individual condition
export const workflowConditionSchema = z
  .object({
    attribute: z.enum(WORKFLOW_ATTRIBUTE_KEYS, {
      error: "Please select an activity for this rule.",
    }),
    operator: z.enum(WORKFLOW_OPERATOR_KEYS).default("gte"),
    value: z
      .union([
        z.number(),
        z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        }),
        z.string(),
        z.array(z.string()),
      ])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.value == null) {
      ctx.addIssue({
        code: "custom",
        message:
          data.attribute === "partnerGroup"
            ? "Please select a partner group."
            : "Please enter a threshold value for this rule.",
        path: ["value"],
      });
      return;
    }

    const operatorDefinition =
      WORKFLOW_OPERATORS[data.operator as keyof typeof WORKFLOW_OPERATORS];

    if (!operatorDefinition) {
      return;
    }

    try {
      operatorDefinition.validate(data.value as any);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid value.",
        path: ["value"],
      });
    }
  });

// Array of conditions
export const workflowConditionsSchema = z.array(workflowConditionSchema);

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

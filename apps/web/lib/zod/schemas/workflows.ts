import {
  WORKFLOW_ATTRIBUTE_KEYS,
  WorkflowAttributeKey,
} from "@/lib/api/workflows/attribute-definitions";
import { WORKFLOW_OPERATOR_KEYS } from "@/lib/api/workflows/operator-definitions";
import { WorkflowTrigger } from "@prisma/client";
import * as z from "zod/v4";

export const WORKFLOW_ATTRIBUTE_TRIGGER: Record<
  WorkflowAttributeKey,
  WorkflowTrigger
> = {
  totalLeads: WorkflowTrigger.partnerMetricsUpdated,
  totalConversions: WorkflowTrigger.partnerMetricsUpdated,
  totalSaleAmount: WorkflowTrigger.partnerMetricsUpdated,
  totalCommissions: WorkflowTrigger.partnerMetricsUpdated,
  partnerEnrolledDays: WorkflowTrigger.partnerEnrolled,
  partnerJoined: WorkflowTrigger.partnerEnrolled,
} as const;

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

// Individual condition
export const workflowConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_ATTRIBUTE_KEYS),
  operator: z.enum(WORKFLOW_OPERATOR_KEYS).default("gte"),
  value: z.union([
    z.number(),
    z.object({
      min: z.number(),
      max: z.number(),
    }),
  ]),
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

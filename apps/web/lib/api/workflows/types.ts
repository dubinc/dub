import {
  WORKFLOW_ATTRIBUTES,
  WORKFLOW_COMPARISON_OPERATORS,
  workflowActionSchema,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { WorkflowTrigger } from "@prisma/client";
import type * as z from "zod/v4";

export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

export type WorkflowConditionAttribute = (typeof WORKFLOW_ATTRIBUTES)[number];

export type WorkflowComparisonOperator =
  (typeof WORKFLOW_COMPARISON_OPERATORS)[number];

export type WorkflowAction = z.infer<typeof workflowActionSchema>;

interface WorkflowIdentity {
  workspaceId: string;
  programId: string;
  partnerId: string;
  groupId?: string;
  customerId?: string;
  customerFirstSaleAt?: Date;
}

interface PartnerMetrics {
  leads?: number;
  conversions?: number;
  saleAmount?: number;
  commissions?: number;
}

export interface WorkflowContext {
  trigger: WorkflowTrigger;
  reason?: "lead" | "sale" | "commission";
  identity: WorkflowIdentity;
  metrics?: {
    current?: PartnerMetrics;
    aggregated?: PartnerMetrics;
  };
}

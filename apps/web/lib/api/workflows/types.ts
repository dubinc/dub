import {
  workflowActionSchema,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { ProgramEnrollment, WorkflowTrigger } from "@prisma/client";
import type * as z from "zod/v4";

export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

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
  programEnrollment?: Pick<
    ProgramEnrollment,
    "groupId" | "createdAt" | "partnerId" | "programId" | "status"
  > & {
    partnerTagIds: string[];
  };
}

export type WorkflowType = "awardBounty" | "sendCampaign" | "moveGroup";

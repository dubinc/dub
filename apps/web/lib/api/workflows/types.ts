import {
  workflowActionSchema,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { ProgramEnrollment, ProgramPartnerTag } from "@prisma/client";
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
  event: WorkflowTriggerEvent;
  identity: WorkflowIdentity;
  metrics?: {
    current?: PartnerMetrics;
    aggregated?: PartnerMetrics;
  };
  programEnrollment?: Pick<
    ProgramEnrollment,
    "groupId" | "createdAt" | "partnerId" | "programId" | "status"
  > & {
    programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  };
}

export type WorkflowType = "awardBounty" | "sendCampaign" | "moveGroup";

export type WorkflowTriggerEvent =
  | "partnerEnrolled"
  | "leadRecorded"
  | "saleRecorded"
  | "commissionRecorded";

import { AWARD_BOUNTY_ATTRIBUTES } from "@/lib/api/workflows/award-bounty/schema";
import { GROUP_MOVE_ATTRIBUTES } from "@/lib/api/workflows/move-group/schema";
import { SEND_CAMPAIGN_ATTRIBUTES } from "@/lib/api/workflows/send-campaign/schema";
import type { WorkflowType } from "@/lib/api/workflows/types";

type WorkflowTypeAttributeDefinition = {
  operators: readonly string[];
  inputType: string;
};

export const WORKFLOW_TYPE_ATTRIBUTES: Record<
  WorkflowType,
  Record<string, WorkflowTypeAttributeDefinition>
> = {
  awardBounty: AWARD_BOUNTY_ATTRIBUTES,
  sendCampaign: SEND_CAMPAIGN_ATTRIBUTES,
  moveGroup: GROUP_MOVE_ATTRIBUTES,
};

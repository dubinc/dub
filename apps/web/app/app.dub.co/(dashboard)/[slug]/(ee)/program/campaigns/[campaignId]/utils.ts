import { WorkflowCondition } from "@/lib/types";
import { CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG } from "@/lib/zod/schemas/campaigns";

export function isValidTriggerCondition(
  triggerCondition: WorkflowCondition,
): boolean {
  // Null/undefined is valid (no trigger condition set)
  if (!triggerCondition) {
    return true;
  }

  // Must have an attribute
  if (!triggerCondition.attribute) {
    return false;
  }

  const config = CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG[triggerCondition.attribute];

  // If attribute doesn't exist in config, invalid
  if (!config) {
    return false;
  }

  // For "none" inputType (e.g., partnerJoined), no value is needed
  if (config.inputType === "none") {
    return true;
  }

  // For all other input types, value must be present and a valid number
  return (
    triggerCondition.value !== null &&
    triggerCondition.value !== undefined &&
    typeof triggerCondition.value === "number" &&
    !isNaN(triggerCondition.value)
  );
}

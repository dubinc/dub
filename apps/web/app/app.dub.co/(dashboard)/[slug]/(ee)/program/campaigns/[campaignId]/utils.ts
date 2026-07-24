import { SEND_CAMPAIGN_ATTRIBUTES } from "@/lib/api/workflows/send-campaign/schema";
import type { WorkflowCondition } from "@/lib/api/workflows/types";

export function isValidTriggerCondition(
  triggerCondition: WorkflowCondition | null | undefined,
): boolean {
  // Null/undefined is valid (no trigger condition set)
  if (!triggerCondition) {
    return true;
  }

  // Must have an attribute
  if (!triggerCondition.attribute) {
    return false;
  }

  const config = SEND_CAMPAIGN_ATTRIBUTES[triggerCondition.attribute];

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

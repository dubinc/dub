import * as z from "zod/v4";
import { hubSpotLeadEventSchema, hubSpotSettingsSchema } from "./schema";

// Decide whether a HubSpot webhook event should record a lead, a sale, or be skipped
export function getHubSpotEventAction({
  event,
  settings,
}: {
  event: Pick<
    z.infer<typeof hubSpotLeadEventSchema>,
    "objectTypeId" | "subscriptionType" | "propertyName" | "propertyValue"
  >;
  settings: z.infer<typeof hubSpotSettingsSchema>;
}): "trackLead" | "trackSale" | "skip" {
  const { objectTypeId, subscriptionType, propertyName, propertyValue } = event;
  const { leadTriggerEvent } = settings;

  const isCreated = subscriptionType === "object.creation";
  const isPropertyChanged = subscriptionType === "object.propertyChange";

  // Contact events
  if (objectTypeId === "0-1") {
    // Deferred lead, recorded for every new contact
    if (isCreated) {
      return "trackLead";
    }

    // Final lead when the contact's lifecycle stage changes (lifecycleStageReached)
    if (isPropertyChanged && leadTriggerEvent === "lifecycleStageReached") {
      return "trackLead";
    }

    return "skip";
  }

  // Deal event
  if (objectTypeId === "0-3") {
    // Final lead when a deal is created (dealCreated)
    if (isCreated) {
      return leadTriggerEvent === "dealCreated" ? "trackLead" : "skip";
    }

    if (!isPropertyChanged || propertyName !== "dealstage") {
      return "skip";
    }

    const newDealStage = String(propertyValue ?? "").toLowerCase();
    const leadDealStageId = settings.leadDealStageId?.toLowerCase();
    const closedWonDealStageId = settings.closedWonDealStageId?.toLowerCase();

    // Final lead when a deal moves into the lead deal stage (dealStageReached)
    if (
      leadTriggerEvent === "dealStageReached" &&
      leadDealStageId &&
      newDealStage === leadDealStageId
    ) {
      return "trackLead";
    }

    // Track the sale event when deal is closed won
    if (closedWonDealStageId && newDealStage === closedWonDealStageId) {
      return "trackSale";
    }

    return "skip";
  }

  // Unknown object type
  return "skip";
}

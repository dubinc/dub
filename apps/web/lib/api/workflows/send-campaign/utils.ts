import { SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS } from "./schema";

export function isSendCampaignEnrollmentAttribute(
  attribute: string,
): attribute is (typeof SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS)[number] {
  return (
    SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS as readonly string[]
  ).includes(attribute);
}

// import "server-only";

import { CreateFraudEventInput } from "@/lib/types";
import { FraudEventGroup, FraudRuleType } from "@dub/prisma/client";
import { createHash } from "crypto";

interface CreateGroupKeyInput {
  type: FraudRuleType;
  programId: string;

  /**
   * The grouping key used to group fraud events. It can be:
   * - partnerId: for partner-specific grouping
   * - Any other identifier relevant to the fraud rule type
   */
  groupingKey: string;
}

interface CreateFingerprintInput
  extends Pick<
    CreateFraudEventInput,
    "type" | "programId" | "partnerId" | "customerId" | "metadata"
  > {}

interface GetIdentityFieldsForRuleInput
  extends Pick<FraudEventGroup, "partnerId" | "type"> {
  customerId?: string | null | undefined;
  metadata?: Record<string, string> | null | undefined;
}

interface CreateGroupHashInput
  extends Pick<
    CreateFraudEventInput,
    "type" | "programId" | "partnerId" | "customerId" | "metadata"
  > {}

// Normalize email for comparison
export function normalizeEmail(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split("@");

  if (parts.length !== 2) {
    return trimmed;
  }

  let [username, domain] = parts;

  // Strip plus addressing for all domains
  const plusIndex = username.indexOf("+");
  if (plusIndex !== -1) {
    username = username.substring(0, plusIndex);
  }

  // Gmail and Google Mail treat dots as irrelevant
  if (domain === "gmail.com" || domain === "googlemail.com") {
    username = username.replace(/\./g, "");
  }

  return `${username}@${domain}`;
}

function createHashKey(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 24);
}

// Create a unique group key to identify and deduplicate fraud events of the same type
// based on programId and groupingKey
// Deprecated: Use createGroupHash instead (Should be removed)
export function createFraudEventGroupKey(input: CreateGroupKeyInput): string {
  const parts = [input.programId, input.type, input.groupingKey].map((p) =>
    p!.toLowerCase(),
  );

  return createHashKey(parts.join("|"));
}

// Creates a unique fingerprint for a fraud event to enable deduplication.
// The fingerprint is generated based on the programId, partnerId, fraud type,
// and identity fields specific to that rule type (e.g., customerId, payoutMethodHash).
export function createFraudEventFingerprint(
  fraudEvent: CreateFingerprintInput,
) {
  try {
    const { programId, partnerId, type } = fraudEvent;

    const identityFields = getIdentityFieldsForRule({
      ...fraudEvent,
      metadata: fraudEvent.metadata as Record<string, string>,
    });

    const normalizedIdentityFields = Object.keys(identityFields)
      .sort()
      .map((key) => `${key}:${identityFields[key]}`)
      .join("|");

    const raw = [programId, partnerId, type, normalizedIdentityFields]
      .map((p) => p!.toLowerCase())
      .join("|");

    return createHashKey(raw);
  } catch (error) {
    console.error("Error creating fingerprint:", error);
  }
}

// Determines which identity fields should be used for fraud event fingerprinting based on the fraud rule type.
// Different fraud rules use different combinations of fields to uniquely identify fraud events.
function getIdentityFieldsForRule({
  type,
  partnerId,
  customerId,
  metadata,
}: GetIdentityFieldsForRuleInput): Record<string, string> {
  switch (type) {
    case "customerEmailMatch":
    case "customerEmailSuspiciousDomain":
    case "referralSourceBanned":
    case "paidTrafficDetected":
      if (!customerId) {
        throw new Error(`customerId is required for ${type} fraud rule.`);
      }

      return {
        customerId,
      };

    case "partnerCrossProgramBan":
    case "partnerFraudReport":
      return {
        partnerId,
      };

    case "partnerDuplicatePayoutMethod":
      if (!metadata?.payoutMethodHash) {
        throw new Error(`payoutMethodHash is required for ${type} fraud rule.`);
      }

      return {
        partnerId,
        payoutMethodHash: metadata.payoutMethodHash,
        duplicatePartnerId: metadata.duplicatePartnerId,
      };
  }
}

// Get the group hash for a fraud rule type.
// This determines which events should be grouped together.
// For partnerDuplicatePayoutMethod: groups by payoutMethodHash (multiple partners can share same group)
// For other rules: groups by partnerId (one group per partner)
export async function createFraudGroupHash({
  programId,
  partnerId,
  type,
  metadata,
}: CreateGroupHashInput) {
  const metadataFields = metadata as Record<string, string>;
  let parts = [programId, type];

  if (type === FraudRuleType.partnerDuplicatePayoutMethod) {
    if (!metadataFields?.payoutMethodHash) {
      throw new Error(`payoutMethodHash is required for ${type} fraud rule.`);
    }

    parts.push(partnerId, metadataFields.payoutMethodHash);
  } else {
    parts.push(partnerId);
  }

  parts = parts.map((p) => p!.toLowerCase());

  return createHashKey(parts.join("|"));
}

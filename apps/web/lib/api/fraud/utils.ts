import { CreateFraudEventInput } from "@/lib/types";
import { FraudEventGroup, FraudRuleType, Prisma } from "@dub/prisma/client";
import { createHash } from "crypto";

interface CreateGroupKeyInput {
  type: FraudRuleType;
  programId: string;
  groupingKey: string;
}

interface CreateFingerprintInput
  extends Pick<
    CreateFraudEventInput,
    "type" | "programId" | "partnerId" | "customerId" | "metadata"
  > {}

interface GetIdentityFieldsForFraudEventInput
  extends Pick<FraudEventGroup, "partnerId" | "type"> {
  customerId?: string | null | undefined;
}

interface CreateGroupHashInput
  extends Pick<CreateFraudEventInput, "type" | "programId" | "partnerId"> {}

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
export function createFraudEventFingerprint(
  fraudEvent: CreateFingerprintInput,
) {
  const identityFields = getIdentityFieldsForFraudEvent(fraudEvent);

  const normalizedIdentityFields = Object.keys(identityFields)
    .sort()
    .map((key) => `${key}:${identityFields[key]}`)
    .join("|");

  const raw = [
    fraudEvent.programId,
    fraudEvent.partnerId,
    fraudEvent.type,
    normalizedIdentityFields,
  ]
    .map((p) => p!.toLowerCase())
    .join("|");

  return createHashKey(raw);
}

// Determines which identity fields should be used for fraud event fingerprinting based on the fraud rule type.
// Different fraud rules use different combinations of fields to uniquely identify fraud events.
function getIdentityFieldsForFraudEvent({
  type,
  partnerId,
  customerId,
}: GetIdentityFieldsForFraudEventInput): Record<string, string> {
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
    case "partnerDuplicatePayoutMethod":
      return {};
  }
}

// Get the group hash for a fraud rule type.
// This determines which events should be grouped together.
export function createFraudGroupHash({
  programId,
  partnerId,
  type,
}: CreateGroupHashInput) {
  const parts = [programId, type, partnerId].map((p) => p!.toLowerCase());

  return createHashKey(parts.join("|"));
}

// Sanitize metadata by removing fields that are stored separately or shouldn't be persisted
export function sanitizeFraudEventMetadata(
  metadata: Prisma.JsonValue | undefined,
) {
  if (!metadata) {
    return undefined;
  }

  const sanitized = metadata as Record<string, any>;

  delete sanitized.duplicatePartnerId;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

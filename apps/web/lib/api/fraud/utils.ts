import { CreateFraudEventInput } from "@/lib/types";
import { FraudEventGroup, FraudRuleType, Prisma } from "@dub/prisma/client";
import { createHash } from "crypto";

interface CreateGroupKeyInput {
  type: FraudRuleType;
  programId: string;
  groupingKey: string;
}

interface CreateEventHashInput
  extends Pick<
    CreateFraudEventInput,
    "type" | "programId" | "partnerId" | "customerId" | "metadata"
  > {}

interface GetIdentityFieldsForFraudEventInput
  extends Pick<FraudEventGroup, "partnerId" | "type"> {
  customerId?: string | null | undefined;
  metadata?: Prisma.JsonValue | undefined;
}

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

// Creates a unique hash for a fraud event to enable deduplication.
export function createFraudEventHash(fraudEvent: CreateEventHashInput) {
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

// Determines which identity fields should be used for fraud event hashing based on the fraud rule type.
// Different fraud rules use different combinations of fields to uniquely identify fraud events.
function getIdentityFieldsForFraudEvent({
  type,
  customerId,
  metadata,
}: GetIdentityFieldsForFraudEventInput): Record<string, string> {
  const eventMetadata = metadata as Record<string, string>;

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

    case "partnerDuplicatePayoutMethod":
      return {
        duplicatePartnerId: eventMetadata?.duplicatePartnerId,
      };

    case "partnerCrossProgramBan":
    case "partnerFraudReport":
      return {};
  }
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
  delete sanitized.payoutMethodHash;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

// Creates a composite key to uniquely identify fraud event groups
export function createGroupCompositeKey(
  event: Pick<CreateFraudEventInput, "programId" | "partnerId" | "type">,
) {
  return `${event.programId}:${event.partnerId}:${event.type}`;
}

// Determine the correct partnerId for a fraud event.
// For duplicate payout method events, uses the duplicatePartnerId from metadata.
export function getPartnerIdForFraudEvent(
  event: Pick<CreateFraudEventInput, "partnerId" | "type" | "metadata">,
) {
  const metadata = event.metadata as Record<string, string> | undefined;

  if (event.type === "partnerDuplicatePayoutMethod") {
    return metadata?.duplicatePartnerId ?? event.partnerId;
  }

  return event.partnerId;
}

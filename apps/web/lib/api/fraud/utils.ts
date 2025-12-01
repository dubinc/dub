import "server-only";

import { FraudRuleType } from "@dub/prisma/client";
import { createHash } from "crypto";

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

export function createHashKey(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 24);
}

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

// Create a unique group key to identify and deduplicate fraud events of the same type
// based on programId and groupingKey
export function createFraudEventGroupKey(input: CreateGroupKeyInput): string {
  const parts = [input.programId, input.type, input.groupingKey].map((p) =>
    p!.toLowerCase(),
  );

  return createHashKey(parts.join("|"));
}

interface CreateFingerprintInput {
  programId: string;
  partnerId: string;
  type: FraudRuleType;

  /**
   * Fields that uniquely define the identity of a fraud event instance.
   * Only include fields that directly impact event identity.
   * Adding arbitrary metadata may cause unnecessary group splits.
   */
  identityFields: Record<string, string>;
}

export function createFraudEventFingerprint(input: CreateFingerprintInput) {
  try {
    const { programId, partnerId, type, identityFields } = input;

    // Normalize identityFields keys so fingerprint is deterministic
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

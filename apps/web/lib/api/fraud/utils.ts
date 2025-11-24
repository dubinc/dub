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

// Create a unique group key to identify and deduplicate fraud events of the same type
// for the same partner-program combination.
// batchId is used when resolving fraud events to create a new unique group key,
// breaking the grouping so resolved events are no longer grouped with
// pending events that share the same programId, partnerId, and type
export function createFraudEventGroupKey({
  programId,
  partnerId,
  type,
  batchId,
}: {
  programId: string;
  partnerId: string;
  type: FraudRuleType;
  batchId?: string;
}): string {
  const parts = [programId, partnerId, type, batchId].map((part) =>
    part?.toLowerCase(),
  );

  return createHash("sha256")
    .update(parts.join("|"))
    .digest("base64url")
    .slice(0, 24);
}

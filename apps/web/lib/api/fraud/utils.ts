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

export function createFraudEventGroupKey({
  programId,
  partnerId,
  type,
  batchId,
}: {
  programId: string;
  partnerId: string;
  type: FraudRuleType;
  batchId?: string; // Will be used to group fraud events together for batch resolution
}): string {
  const parts = [programId, partnerId, type, batchId].filter(Boolean);

  return createHash("sha256").update(parts.join("|")).digest("hex");
}

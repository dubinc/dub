import { createHash } from "crypto";
import { VeriffDecisionEvent } from "./schema";

export function computeVeriffIdentityHash(
  verification: VeriffDecisionEvent["verification"],
) {
  const { person, document } = verification;

  // Prefer document number (passport/ID number) — strongest unique signal
  if (document?.number) {
    const input = [
      "doc",
      document.number.toLowerCase().trim(),
      ...(document.country ? [document.country.toUpperCase().trim()] : []),
    ].join("|");

    return createHash("sha256").update(input).digest("hex");
  }

  // Fall back to name + date of birth
  if ((person?.firstName || person?.lastName) && person?.dateOfBirth) {
    const input = [
      "person",
      ...(person.firstName ? [person.firstName.toLowerCase().trim()] : []),
      ...(person.lastName ? [person.lastName.toLowerCase().trim()] : []),
      person.dateOfBirth.trim(),
    ].join("|");

    return createHash("sha256").update(input).digest("hex");
  }

  return null;
}

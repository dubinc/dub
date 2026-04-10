import { createHash } from "crypto";
import { VeriffDecisionEvent } from "./schema";

export function computeVeriffIdentityHash(
  verification: VeriffDecisionEvent["verification"],
) {
  const { person, document } = verification;
  const documentNumber = document?.number?.trim();
  const documentCountry = document?.country?.trim();
  const firstName = person?.firstName?.trim();
  const lastName = person?.lastName?.trim();
  const dateOfBirth = person?.dateOfBirth?.trim();

  // Prefer document number (passport/ID number) — strongest unique signal
  if (documentNumber) {
    const input = [
      "doc",
      documentNumber.toLowerCase(),
      ...(documentCountry ? [documentCountry.toUpperCase()] : []),
    ].join("|");
    return createHash("sha256").update(input).digest("hex");
  }

  // Fall back to name + date of birth
  if ((firstName || lastName) && dateOfBirth) {
    const input = [
      "person",
      ...(firstName ? [firstName.toLowerCase()] : []),
      ...(lastName ? [lastName.toLowerCase()] : []),
      dateOfBirth,
    ].join("|");
    return createHash("sha256").update(input).digest("hex");
  }

  return null;
}

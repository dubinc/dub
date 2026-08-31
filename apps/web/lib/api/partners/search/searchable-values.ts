import { PartnerSearchDocument } from "./types";

/**
 * Who the partner is: the fields someone types when they have a specific person
 * in mind. Short and stable, so a provider can index them separately and score a
 * name match against name length rather than against a document whose length is
 * really a count of how many links the partner has.
 */
export function getPartnerIdentityValues(
  document: PartnerSearchDocument,
): string[] {
  return [
    document.partnerId,
    document.name,
    document.email,
    document.companyName,
  ].filter((value): value is string => Boolean(value));
}

/**
 * Every value covered by the partner-search assignment. Providers can index
 * these as separate weighted fields or as one normalized search field.
 */
export function getPartnerSearchableValues(
  document: PartnerSearchDocument,
): string[] {
  return [
    ...getPartnerIdentityValues(document),
    document.description,
    ...document.platformTypes,
    ...document.platformIdentifiers,
    ...document.linkKeys,
    ...document.destinationUrls,
  ].filter((value): value is string => Boolean(value));
}

export function normalizePartnerSearchQuery(query: string): string {
  // Normalize equivalent Unicode characters for consistent matching.
  return query.normalize("NFKC").trim().toLowerCase();
}

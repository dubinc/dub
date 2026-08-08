import { PartnerSearchDocument } from "./types";

/**
 * Returns every value covered by the partner-search assignment. Providers can
 * index these as separate weighted fields or as one normalized search field.
 */
export function getPartnerSearchableValues(
  document: PartnerSearchDocument,
): string[] {
  return [
    document.name,
    document.email,
    document.companyName,
    document.description,
    ...document.platformTypes,
    ...document.platformIdentifiers,
    ...document.linkDomains,
    ...document.linkKeys,
    ...document.shortLinks,
    ...document.destinationUrls,
  ].filter((value): value is string => Boolean(value));
}

export function normalizePartnerSearchQuery(query: string): string {
  // Normalize equivalent Unicode characters for consistent matching.
  return query.normalize("NFKC").trim().toLowerCase();
}

import { PlatformType, ProgramEnrollmentStatus } from "@prisma/client";

/**
 * How many ranked enrollment IDs a provider may return for one query.
 *
 * 999 because Upstash Redis Search rejects anything from 1000 up
 * (`ERR limit should be a positive number less than 1000`).
 *
 * KNOWN LIMITATION: filters run after this cut, not before.
 *
 *   1. the provider ranks matches and keeps the top 999, ignoring all filters
 *   2. the database applies status/group/country/tag/metric to those 999
 *
 * A query matching fewer than 999 is unaffected. Beyond that, both the rows and
 * the count are a floor, and nothing reports that — neither response has a
 * field for it that could be added without breaking its shape.
 *
 * The fix is indexing the filterable fields so the provider filters before it
 * ranks, which means keeping them in sync on every write — out of scope here.
 */
export const PARTNER_SEARCH_CANDIDATE_LIMIT = 999;

export function validatePartnerSearchCandidateLimit(limit: number) {
  if (
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    limit > PARTNER_SEARCH_CANDIDATE_LIMIT
  ) {
    throw new Error(
      `Partner search candidate limit must be between 1 and ${PARTNER_SEARCH_CANDIDATE_LIMIT}.`,
    );
  }
}

/**
 * Program enrollment data stored in the partner search index.
 * The database remains the source of truth, so every field must be rebuildable.
 */
export interface PartnerSearchDocument {
  id: string;
  programId: string;
  partnerId: string;

  // Searchable partner profile fields
  name: string;
  email: string | null;
  companyName: string | null;
  description: string | null;

  // Searchable platform fields
  platformTypes: PlatformType[];
  platformIdentifiers: string[];

  // Searchable link fields
  linkDomains: string[];
  linkKeys: string[];
  shortLinks: string[];
  destinationUrls: string[];

  // Filterable fields. Metrics are deliberately absent: they move on every click
  // and conversion, so indexing them would make the document churn continuously.
  status: ProgramEnrollmentStatus;
  groupId: string | null;
  country: string | null;
  partnerTagIds: string[];
}

export interface PartnerSearchHit {
  id: string;
  score?: number;
}

export interface PartnerSearchResult {
  hits: PartnerSearchHit[];
}

/**
 * A discrete filter, plus whether the caller is excluding those values. Exclusion
 * also matches partners that have no value at all, which is what the database
 * does when it ORs the negation with IS NULL.
 */
export interface PartnerSearchCandidateFilter {
  values: string[];
  exclude?: boolean;
}

export interface PartnerSearchCandidateQuery {
  programId: string;
  query: string;
  limit: number;
  /**
   * Applied by the provider before it truncates to `limit`. The database still
   * re-applies every one of them, so the index only ever narrows the candidate
   * pool — it never decides the result on its own.
   */
  filters?: {
    status?: PartnerSearchCandidateFilter;
    groupId?: PartnerSearchCandidateFilter;
    country?: PartnerSearchCandidateFilter;
    partnerTagIds?: PartnerSearchCandidateFilter;
  };
}

export interface PartnerSearchProvider {
  searchCandidates(
    query: PartnerSearchCandidateQuery,
  ): Promise<PartnerSearchResult>;
  /**
   * How many documents match, ignoring `limit`. Null when the provider cannot
   * answer cheaply, which the caller handles by counting another way.
   */
  countCandidates(query: PartnerSearchCandidateQuery): Promise<number | null>;
  upsert(documents: PartnerSearchDocument[]): Promise<void>;
  delete(documentIds: string[]): Promise<void>;
}

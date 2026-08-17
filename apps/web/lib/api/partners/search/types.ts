import { PlatformType, ProgramEnrollmentStatus } from "@prisma/client";

/**
 * How many ranked enrollment IDs a provider may return for one query.
 *
 * 999 is inherited rather than derived: the original Redis provider rejected
 * anything from 1000 up. Nothing enforces it now, so it is simply the ceiling
 * this was tuned and measured against.
 *
 * Status, group, country, and tags are applied by the provider *before* this
 * cut, because they are indexed as filterable attributes. The filters the
 * document does not carry are applied by the database *after* it, over an
 * already truncated list:
 *
 *   - tenant ID and explicit partner IDs
 *   - the referral filter
 *   - every metric range, deliberately absent from the document because
 *     metrics move on each click and would churn it continuously
 *
 * A query still matching more than 999 documents after the provider's filters
 * reports a floor rather than a total, for both the rows and the count, and
 * neither response has a field that could surface it without changing shape.
 * That is an accepted trade: a search matching that many partners is one being
 * refined rather than read, while raising the ceiling is paid on every query,
 * in a larger `top_k` across each ranked branch, a longer `IN` list for the
 * database, and more rows ordered in memory for a relevance sort. Narrowing by
 * a database-only filter lowers the floor further, since it removes rows the
 * cut had already kept.
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

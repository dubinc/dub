import { PlatformType } from "@prisma/client";

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
 * the count are a floor. There is no field on the list or count response to say
 * so without breaking their shape, so findPartnerSearchCandidates logs it.
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
}

export interface PartnerSearchHit {
  id: string;
  score?: number;
}

export interface PartnerSearchResult {
  hits: PartnerSearchHit[];
}

export interface PartnerSearchCandidateQuery {
  programId: string;
  query: string;
  limit: number;
}

export interface PartnerSearchDocumentPage {
  documentIds: string[];
  /**
   * Null once enumeration is exhausted. An empty page with a non-null cursor is
   * normal — Redis SCAN returns those routinely — so callers must loop until
   * the cursor is null rather than stopping on the first empty page.
   */
  cursor: string | null;
}

export interface PartnerSearchProvider {
  searchCandidates(
    query: PartnerSearchCandidateQuery,
  ): Promise<PartnerSearchResult>;
  waitForIndexing(): Promise<void>;
  upsert(documents: PartnerSearchDocument[]): Promise<void>;
  delete(documentIds: string[]): Promise<void>;
  /** Walks every indexed document so reconciliation can find orphans. */
  listDocumentIds(options: {
    cursor?: string;
    limit: number;
  }): Promise<PartnerSearchDocumentPage>;
}

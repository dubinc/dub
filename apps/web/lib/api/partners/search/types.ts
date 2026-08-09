import { PlatformType } from "@prisma/client";

export const PARTNER_SEARCH_CANDIDATE_LIMIT = 100;

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

export interface PartnerSearchProvider {
  searchCandidates(
    query: PartnerSearchCandidateQuery,
  ): Promise<PartnerSearchResult>;
  waitForIndexing(): Promise<void>;
  upsert(documents: PartnerSearchDocument[]): Promise<void>;
  delete(documentIds: string[]): Promise<void>;
}

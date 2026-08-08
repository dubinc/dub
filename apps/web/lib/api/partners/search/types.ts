import { PlatformType, ProgramEnrollmentStatus } from "@prisma/client";

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

  // Program-scoped fields needed to constrain search results
  status: ProgramEnrollmentStatus;
  groupId: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSearchQuery {
  programId: string;
  query: string;
  limit: number;
  offset: number;
}

export interface PartnerSearchHit {
  id: string;
  partnerId: string;
  score?: number;
}

export interface PartnerSearchResult {
  hits: PartnerSearchHit[];
  total: number;
}

export interface PartnerSearchProvider {
  search(query: PartnerSearchQuery): Promise<PartnerSearchResult>;
  upsert(documents: PartnerSearchDocument[]): Promise<void>;
  delete(documentIds: string[]): Promise<void>;
}

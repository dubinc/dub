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

  // Program-scoped fields used by search filters and sorting
  status: ProgramEnrollmentStatus;
  tenantId: string | null;
  groupId: string | null;
  country: string | null;
  partnerTagIds: string[];
  referredByPartnerId: string | null;
  totalClicks: number;
  totalLeads: number;
  totalConversions: number;
  totalSaleAmount: number;
  totalCommissions: number;
  netRevenue: number;
  earningsPerClick: number;
  averageLifetimeValue: number | null;
  clickToLeadRate: number | null;
  clickToConversionRate: number | null;
  leadToConversionRate: number | null;
  returnOnAdSpend: number | null;
  createdAt: string;
  updatedAt: string;
}

export type PartnerSearchSortField =
  | "createdAt"
  | "totalClicks"
  | "totalLeads"
  | "totalConversions"
  | "totalSaleAmount"
  | "totalCommissions"
  | "netRevenue"
  | "earningsPerClick"
  | "averageLifetimeValue"
  | "clickToLeadRate"
  | "clickToConversionRate"
  | "leadToConversionRate"
  | "returnOnAdSpend";

export type PartnerSearchMetricField = Exclude<
  PartnerSearchSortField,
  "createdAt"
>;

export interface PartnerSearchListFilter {
  values: string[];
  operator: "IN" | "NOT_IN";
}

export interface PartnerSearchRangeFilter {
  min?: number;
  max?: number;
}

export interface PartnerSearchFilters {
  status?: ProgramEnrollmentStatus;
  tenantId?: string;
  partnerIds?: string[];
  groupIds?: PartnerSearchListFilter;
  countries?: PartnerSearchListFilter;
  partnerTagIds?: PartnerSearchListFilter;
  referredByPartnerId?: string;
  metrics?: Partial<Record<PartnerSearchMetricField, PartnerSearchRangeFilter>>;
}

export interface PartnerSearchQuery {
  programId: string;
  query: string;
  filters?: PartnerSearchFilters;
  page: number;
  pageSize: number;
  sort?: {
    field: PartnerSearchSortField;
    order: "asc" | "desc";
  };
}

export type PartnerSearchCountQuery = Pick<
  PartnerSearchQuery,
  "programId" | "query" | "filters"
>;

export type PartnerSearchGroupField =
  | "status"
  | "country"
  | "groupId"
  | "partnerTagId"
  | "referredByPartnerId";

export interface PartnerSearchGroup {
  value: string | null;
  count: number;
}

export interface PartnerSearchHit {
  id: string;
  partnerId: string;
  score?: number;
}

export interface PartnerSearchResult {
  hits: PartnerSearchHit[];
}

export interface PartnerSearchProvider {
  mode?: "full" | "relevance-only";
  search(query: PartnerSearchQuery): Promise<PartnerSearchResult>;
  count(query: PartnerSearchCountQuery): Promise<number>;
  groupBy(
    query: PartnerSearchCountQuery,
    field: PartnerSearchGroupField,
  ): Promise<PartnerSearchGroup[]>;
  waitForIndexing(): Promise<void>;
  upsert(documents: PartnerSearchDocument[]): Promise<void>;
  delete(documentIds: string[]): Promise<void>;
}

import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import { PARTNER_SEARCH_CANDIDATE_LIMIT } from "./constants";
import { PartnerSearchCandidateQuery } from "./types";

export type PartnerSearchQueryInput = z.infer<
  typeof getPartnersQuerySchemaExtended
> & {
  programId: string;
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

type PartnerSearchCandidateQueryInput = Pick<
  PartnerSearchQueryInput,
  "programId" | "search" | "email" | "tenantId"
>;

export function buildPartnerSearchCandidateQuery({
  programId,
  search,
  email,
  tenantId,
}: PartnerSearchCandidateQueryInput): PartnerSearchCandidateQuery | null {
  const query = search?.trim();

  // Exact email and tenant lookups remain database-only. The search provider
  // is responsible only for finding relevance-ranked free-text candidates.
  if (!query || email || tenantId) {
    return null;
  }

  return {
    programId,
    query,
    limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
  };
}

import { isExactEmailQuery } from "@/lib/api/partners/program-enrollment-query";
import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import {
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  PartnerSearchCandidateQuery,
} from "./types";

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
  //
  // A search that is itself a complete address is the same lookup: `email` is a
  // unique indexed column, so the database answers it exactly, and routing it
  // through the provider would spend a network round trip to rank one row.
  if (!query || email || tenantId || isExactEmailQuery(query)) {
    return null;
  }

  return {
    programId,
    query,
    limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
  };
}

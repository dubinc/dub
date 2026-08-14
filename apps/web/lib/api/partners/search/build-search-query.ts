import { isExactPartnerIdQuery } from "@/lib/api/partners/program-enrollment-query";
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
  // A pasted partner ID joins them, and unlike a complete email it needs no
  // fallback: the provider indexes the ID as a plain token, so a miss there is
  // the same miss the primary key already gave, without the round trip.
  if (!query || email || tenantId || isExactPartnerIdQuery(query)) {
    return null;
  }

  return {
    programId,
    query,
    limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
  };
}

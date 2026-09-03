import { isExactPartnerIdQuery } from "@/lib/api/partners/program-enrollment-query";
import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import {
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  PartnerSearchCandidateFilter,
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
  | "programId"
  | "search"
  | "email"
  | "tenantId"
  | "status"
  | "groupId"
  | "country"
  | "partnerTagId"
  | "groupIdOperator"
  | "countryOperator"
  | "partnerTagIdOperator"
>;

function toFilter(
  value: string | string[] | undefined | null,
  operator?: "IN" | "NOT IN",
): PartnerSearchCandidateFilter | undefined {
  const values = (Array.isArray(value) ? value : [value]).filter(
    (entry): entry is string => Boolean(entry),
  );

  return values.length > 0
    ? { values, exclude: operator === "NOT IN" }
    : undefined;
}

export function buildPartnerSearchCandidateQuery({
  programId,
  search,
  email,
  tenantId,
  status,
  groupId,
  country,
  partnerTagId,
  groupIdOperator,
  countryOperator,
  partnerTagIdOperator,
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
    filters: {
      status: toFilter(status),
      groupId: toFilter(groupId, groupIdOperator),
      country: toFilter(country, countryOperator),
      partnerTagIds: toFilter(partnerTagId, partnerTagIdOperator),
    },
  };
}

/**
 * A dotted host with an optional protocol, `www.`, and URL suffix. Plain words
 * and email addresses do not match. This limits the program lookup to
 * link-shaped search values.
 */
const LINK_SHAPED_QUERY =
  /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)([/?#]\S*)?$/i;

export function isLinkShapedQuery(query: string): boolean {
  return LINK_SHAPED_QUERY.test(query.trim());
}

/**
 * Removes the program domain from a matching short link. The search index
 * stores link keys, but it does not store link domains. Removing the domain
 * prevents unrelated domain tokens from adding matches or changing result
 * order. Other domains and bare domains are returned unchanged.
 */
export function stripProgramDomain(
  query: string,
  programDomain: string | null | undefined,
): string {
  const match = query.trim().match(LINK_SHAPED_QUERY);

  if (!match || !programDomain) {
    return query;
  }

  const [, host, rest = ""] = match;
  const normalizedDomain = programDomain.toLowerCase().replace(/^www\./, "");

  if (host.toLowerCase() !== normalizedDomain) {
    return query;
  }

  // Query strings and fragments are never part of a key
  const key = rest
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "")
    .trim();

  return key || query;
}

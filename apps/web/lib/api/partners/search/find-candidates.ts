import type {
  PartnerSearchCandidateQuery,
  PartnerSearchProvider,
  PartnerSearchResult,
} from "./types";

interface FindPartnerSearchCandidatesOptions {
  /**
   * Surface provider failures instead of degrading. The benchmark needs this so
   * a broken provider cannot be reported as a fast, error-free run.
   */
  throwOnError?: boolean;
}

/**
 * Resolves relevance candidates, falling back to the database search path when
 * the provider fails. Returning null here is what the callers already do when
 * no provider is configured, so a provider outage costs relevance ranking and
 * the wider field coverage rather than the entire partners list.
 */
export async function findPartnerSearchCandidates(
  searchProvider: PartnerSearchProvider,
  query: PartnerSearchCandidateQuery,
  { throwOnError = false }: FindPartnerSearchCandidatesOptions = {},
): Promise<PartnerSearchResult | null> {
  try {
    return await searchProvider.searchCandidates(query);
  } catch (error) {
    if (throwOnError) {
      throw error;
    }

    console.error(
      "[Partner Search] Candidate lookup failed, falling back to the database search path.",
      error,
    );

    return null;
  }
}

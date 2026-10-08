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
 * Returns ranked candidates from the search provider. We will use the
 * database search path instead, and return null, when the provider fails.
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

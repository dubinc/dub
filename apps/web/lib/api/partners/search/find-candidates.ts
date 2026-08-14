import { isExactEmailQuery } from "@/lib/api/partners/program-enrollment-query";
import { prisma } from "@/lib/prisma";
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
 *
 * A complete email address takes the same exit, but only once the database
 * confirms it: `email` is unique and indexed, so the lookup is a point read
 * against a network round trip. A miss still goes to the provider, because an
 * address matching nothing exactly is usually one the caller is still typing —
 * `steven@dub.co` on the way to `steven@dub.com` — and n-grams still match it.
 */
export async function findPartnerSearchCandidates(
  searchProvider: PartnerSearchProvider,
  query: PartnerSearchCandidateQuery,
  { throwOnError = false }: FindPartnerSearchCandidatesOptions = {},
): Promise<PartnerSearchResult | null> {
  if (isExactEmailQuery(query.query)) {
    const partner = await prisma.partner.findUnique({
      where: { email: query.query },
      select: { id: true },
    });

    if (partner) {
      return null;
    }
  }

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

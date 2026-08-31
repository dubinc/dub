import { isExactEmailQuery } from "@/lib/api/partners/program-enrollment-query";
import { prisma } from "@/lib/prisma";
import type {
  PartnerSearchCandidateQuery,
  PartnerSearchProvider,
  PartnerSearchResult,
} from "./types";

/**
 * A pasted short link: a host with a path, with or without the protocol, e.g.
 * `go.acme.com/partnername`. A bare domain is not one, because typing a domain
 * is a text search, while a host plus path only ever comes from pasting a link.
 */
const SHORT_LINK_QUERY_PATTERN =
  /^(?:https?:\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/\S+)$/i;

/**
 * Resolves a pasted short link to its enrollment through `Link.shortLink`,
 * which is unique and indexed, so the paste matches exactly the partner who
 * owns that link. The domain tokens of a short link are shared by every
 * partner in the program, so the ranked path cannot make a paste precise.
 *
 * Misses fall through to the ranked search: a partial paste still matches the
 * key by prefix. A link from another program returns no hits rather than
 * falling through, since its tokens would only flood the ranked results.
 */
async function findExactShortLinkResult({
  programId,
  query,
}: PartnerSearchCandidateQuery): Promise<PartnerSearchResult | null> {
  const match = query.trim().match(SHORT_LINK_QUERY_PATTERN);

  if (!match) {
    return null;
  }

  const [, host, path] = match;
  const link = await prisma.link.findUnique({
    where: { shortLink: `https://${host}${path}` },
    select: { programId: true, partnerId: true },
  });

  if (!link?.partnerId || !link.programId) {
    return null;
  }

  if (link.programId !== programId) {
    return { hits: [], exact: true };
  }

  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: { partnerId: link.partnerId, programId },
    },
    select: { id: true },
  });

  return { hits: enrollment ? [{ id: enrollment.id }] : [], exact: true };
}

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
 * address matching nothing exactly is usually one the caller is still typing,
 * `steven@dub.co` on the way to `steven@dub.com`, and n-grams still match it.
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

  const exactShortLinkResult = await findExactShortLinkResult(query);

  if (exactShortLinkResult) {
    return exactShortLinkResult;
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

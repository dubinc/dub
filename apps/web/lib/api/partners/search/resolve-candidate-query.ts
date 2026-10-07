import { prisma } from "@/lib/prisma";
import {
  buildPartnerSearchCandidateQuery,
  isLinkShapedQuery,
  stripProgramDomain,
} from "./build-search-query";
import type { PartnerSearchCandidateQuery } from "./types";

/**
 * Builds the candidate query and removes the program domain from a matching
 * short link. Shared by the list and the count so both send the provider the
 * same query.
 */
export async function resolvePartnerSearchCandidateQuery(
  input: Parameters<typeof buildPartnerSearchCandidateQuery>[0],
): Promise<PartnerSearchCandidateQuery | null> {
  const candidateQuery = buildPartnerSearchCandidateQuery(input);

  if (!candidateQuery || !isLinkShapedQuery(candidateQuery.query)) {
    return candidateQuery;
  }

  const program = await prisma.program.findUnique({
    where: { id: candidateQuery.programId },
    select: { domain: true },
  });

  return {
    ...candidateQuery,
    query: stripProgramDomain(candidateQuery.query, program?.domain),
  };
}

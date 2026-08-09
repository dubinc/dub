import { validatePartnerSearchCandidateLimit } from "../constants";
import {
  getPartnerSearchableValues,
  normalizePartnerSearchQuery,
} from "../searchable-values";
import {
  PartnerSearchCandidateQuery,
  PartnerSearchDocument,
  PartnerSearchProvider,
} from "../types";

function findMatchingDocuments(
  documents: Iterable<PartnerSearchDocument>,
  { programId, query }: PartnerSearchCandidateQuery,
): PartnerSearchDocument[] {
  const normalizedQuery = normalizePartnerSearchQuery(query);

  return Array.from(documents).filter(
    (document) =>
      document.programId === programId &&
      getPartnerSearchableValues(document).some((value) =>
        normalizePartnerSearchQuery(value).includes(normalizedQuery),
      ),
  );
}

/**
 * In-memory search used for unit tests and API plumbing. It is not
 * intended for production or performance testing.
 */
export function createMockPartnerSearchProvider(
  initialDocuments: PartnerSearchDocument[] = [],
): PartnerSearchProvider {
  const documents = new Map(
    initialDocuments.map((document) => [document.id, document]),
  );

  return {
    async searchCandidates({
      programId,
      query,
      limit,
    }: PartnerSearchCandidateQuery) {
      validatePartnerSearchCandidateLimit(limit);
      const matches = findMatchingDocuments(documents.values(), {
        programId,
        query,
        limit,
      });

      return {
        hits: matches.slice(0, limit).map((document) => ({
          id: document.id,
        })),
      };
    },

    async waitForIndexing() {},

    async upsert(updatedDocuments) {
      for (const document of updatedDocuments) {
        documents.set(document.id, document);
      }
    },

    async delete(documentIds) {
      for (const documentId of documentIds) {
        documents.delete(documentId);
      }
    },
  };
}

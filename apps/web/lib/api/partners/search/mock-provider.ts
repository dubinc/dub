import {
  getPartnerSearchableValues,
  normalizePartnerSearchQuery,
} from "./searchable-values";
import {
  PartnerSearchDocument,
  PartnerSearchProvider,
  PartnerSearchQuery,
} from "./types";

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
    async search({ programId, query, limit, offset }: PartnerSearchQuery) {
      const normalizedQuery = normalizePartnerSearchQuery(query);
      const matches = Array.from(documents.values()).filter(
        (document) =>
          document.programId === programId &&
          getPartnerSearchableValues(document).some((value) =>
            normalizePartnerSearchQuery(value).includes(normalizedQuery),
          ),
      );

      return {
        hits: matches.slice(offset, offset + limit).map((document) => ({
          id: document.id,
          partnerId: document.partnerId,
        })),
        total: matches.length,
      };
    },

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

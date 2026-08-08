import {
  getPartnerSearchableValues,
  normalizePartnerSearchQuery,
} from "./searchable-values";
import {
  PartnerSearchCountQuery,
  PartnerSearchDocument,
  PartnerSearchFilters,
  PartnerSearchGroupField,
  PartnerSearchListFilter,
  PartnerSearchMetricField,
  PartnerSearchProvider,
  PartnerSearchQuery,
} from "./types";

function matchesListFilter(
  value: string | null,
  filter: PartnerSearchListFilter,
): boolean {
  const matches = value !== null && filter.values.includes(value);
  return filter.operator === "IN" ? matches : !matches;
}

function matchesArrayFilter(
  values: string[],
  filter: PartnerSearchListFilter,
): boolean {
  const matches = values.some((value) => filter.values.includes(value));
  return filter.operator === "IN" ? matches : !matches;
}

function matchesFilters(
  document: PartnerSearchDocument,
  filters: PartnerSearchFilters | undefined,
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.status && document.status !== filters.status) {
    return false;
  }
  if (filters.tenantId && document.tenantId !== filters.tenantId) {
    return false;
  }
  if (filters.partnerIds && !filters.partnerIds.includes(document.partnerId)) {
    return false;
  }
  if (
    filters.groupIds &&
    !matchesListFilter(document.groupId, filters.groupIds)
  ) {
    return false;
  }
  if (
    filters.countries &&
    !matchesListFilter(document.country, filters.countries)
  ) {
    return false;
  }
  if (
    filters.partnerTagIds &&
    !matchesArrayFilter(document.partnerTagIds, filters.partnerTagIds)
  ) {
    return false;
  }
  if (
    filters.referredByPartnerId &&
    document.referredByPartnerId !== filters.referredByPartnerId
  ) {
    return false;
  }

  for (const [field, range] of Object.entries(filters.metrics ?? {})) {
    const value = document[field as PartnerSearchMetricField];
    if (value === null) {
      return false;
    }
    if (range.min !== undefined && value < range.min) {
      return false;
    }
    if (range.max !== undefined && value > range.max) {
      return false;
    }
  }

  return true;
}

function compareDocuments(
  left: PartnerSearchDocument,
  right: PartnerSearchDocument,
  sort: NonNullable<PartnerSearchQuery["sort"]>,
): number {
  const leftValue = left[sort.field];
  const rightValue = right[sort.field];

  if (leftValue === rightValue) {
    return left.id.localeCompare(right.id);
  }
  if (leftValue === null) {
    return 1;
  }
  if (rightValue === null) {
    return -1;
  }

  const comparison = leftValue < rightValue ? -1 : 1;
  return sort.order === "asc" ? comparison : -comparison;
}

function findMatchingDocuments(
  documents: Iterable<PartnerSearchDocument>,
  { programId, query, filters }: PartnerSearchCountQuery,
): PartnerSearchDocument[] {
  const normalizedQuery = normalizePartnerSearchQuery(query);

  return Array.from(documents).filter(
    (document) =>
      document.programId === programId &&
      matchesFilters(document, filters) &&
      getPartnerSearchableValues(document).some((value) =>
        normalizePartnerSearchQuery(value).includes(normalizedQuery),
      ),
  );
}

function getGroupValues(
  document: PartnerSearchDocument,
  field: PartnerSearchGroupField,
): (string | null)[] {
  if (field === "partnerTagId") {
    return document.partnerTagIds;
  }

  return [document[field]];
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
    async search({
      programId,
      query,
      page,
      pageSize,
      filters,
      sort,
    }: PartnerSearchQuery) {
      const matches = findMatchingDocuments(documents.values(), {
        programId,
        query,
        filters,
      });

      if (sort) {
        matches.sort((left, right) => compareDocuments(left, right, sort));
      }

      const offset = (page - 1) * pageSize;

      return {
        hits: matches.slice(offset, offset + pageSize).map((document) => ({
          id: document.id,
          partnerId: document.partnerId,
        })),
        total: matches.length,
      };
    },

    async count(query) {
      return findMatchingDocuments(documents.values(), query).length;
    },

    async groupBy(query, field) {
      const groups = new Map<string | null, number>();

      for (const document of findMatchingDocuments(documents.values(), query)) {
        for (const value of getGroupValues(document, field)) {
          if (field === "referredByPartnerId" && value === null) {
            continue;
          }
          groups.set(value, (groups.get(value) ?? 0) + 1);
        }
      }

      return Array.from(groups, ([value, count]) => ({ value, count }));
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

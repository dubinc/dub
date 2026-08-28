import { normalizePartnerSearchQuery } from "../searchable-values";

const NGRAM_SIZE = 3;

/**
 * Three-character tokens, which is what lets a partial email match without a
 * leading-wildcard query.
 */
function toNgrams(value: string): string[] {
  return Array.from(
    new Set(
      Array.from({ length: value.length - (NGRAM_SIZE - 1) }, (_, index) =>
        value.slice(index, index + NGRAM_SIZE),
      ),
    ),
  );
}

/** N-grams of an indexed email, as the space-separated field the document stores. */
export function getEmailNgrams(email: string | null): string {
  if (!email) {
    return "";
  }

  const normalized = normalizePartnerSearchQuery(email);
  if (normalized.length < NGRAM_SIZE) {
    return normalized;
  }

  return toNgrams(normalized).join(" ");
}

/**
 * N-grams of a search term, or none when the term cannot use the n-gram path.
 * Multi-word queries are excluded because the stored field holds n-grams of a
 * single address.
 */
export function getQueryNgrams(query: string): string[] {
  if (query.length < NGRAM_SIZE || /\s/u.test(query)) {
    return [];
  }

  return toNgrams(query);
}

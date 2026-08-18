import { createTurbopufferPartnerSearchProvider } from "./providers/turbopuffer";
import type { PartnerSearchProvider } from "./types";

// Built once per process. A fresh client per call would create a new HTTP
// connection pool each time, paying a TLS handshake on every search.
let cachedSearchProvider: PartnerSearchProvider | null = null;

/**
 * The provider for everything that writes: the sync jobs, backfill and sweep.
 * Null until turbopuffer is configured, which is what keeps this dark.
 *
 * Once set where traffic is served, leave it set. Only the live sync hooks can
 * remove a document, so any window with this unset strands every enrollment
 * deleted during it until the namespace is rebuilt.
 */
export function getPartnerSearchProvider(): PartnerSearchProvider | null {
  if (!process.env.TURBOPUFFER_API_KEY?.trim()) {
    return null;
  }

  cachedSearchProvider ??= createTurbopufferPartnerSearchProvider();

  return cachedSearchProvider;
}

/**
 * Whether the partners list and count read from the index rather than the
 * database.
 *
 * Separate from the key so that turning search off never turns indexing off.
 * Writes stay on and are never flipped, so the index keeps tracking deletions
 * while nothing reads it.
 *
 * It also keeps reads off until the backfill finishes. An empty index does not
 * fall back: an empty candidate list is applied as `id IN ()` once the database
 * search predicate is cleared, so every query returns nothing.
 */
export function isPartnerSearchReadEnabled(): boolean {
  return process.env.PARTNER_SEARCH_READ_ENABLED?.trim() === "true";
}

export function getPartnerSearchReadProvider(): PartnerSearchProvider | null {
  return isPartnerSearchReadEnabled() ? getPartnerSearchProvider() : null;
}

import { createTurbopufferPartnerSearchProvider } from "./providers/turbopuffer";
import type { PartnerSearchProvider } from "./types";

// Built once per process. A fresh client per call would create a new HTTP
// connection pool each time, paying a TLS handshake on every search.
let cachedSearchProvider: PartnerSearchProvider | null = null;

/**
 * The provider for everything that writes: the sync jobs, the backfill, and the
 * reconciliation sweep.
 *
 * Null until turbopuffer is configured, which is what keeps this dark: every
 * caller falls back to the database search path when there is no provider, so
 * an unset key costs the wider field coverage rather than the partner list.
 *
 * Once set in an environment that serves traffic, leave it set. Removing a
 * document is something only the live sync hooks can do, because the backfill
 * and the sweep upsert and never delete. Any window where the app runs with
 * this unset therefore turns every enrollment deleted during it into a document
 * nothing can remove short of rebuilding the namespace.
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
 * Reads get their own switch so that turning search off never means turning
 * indexing off. Writes stay on from the first day and are never flipped, so the
 * index keeps tracking deletions even while nothing is reading it, and coming
 * back is a matter of setting this flag rather than rebuilding a namespace.
 *
 * The same switch is what lets reads stay off until the backfill has finished.
 * An empty index does not fall back to the database: a program with no
 * documents yet produces a successful, empty candidate list, which the callers
 * apply as `id IN ()` after clearing the database search predicate, so every
 * query returns nothing.
 */
export function isPartnerSearchReadEnabled(): boolean {
  return process.env.PARTNER_SEARCH_READ_ENABLED?.trim() === "true";
}

export function getPartnerSearchReadProvider(): PartnerSearchProvider | null {
  return isPartnerSearchReadEnabled() ? getPartnerSearchProvider() : null;
}

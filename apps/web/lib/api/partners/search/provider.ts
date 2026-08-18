import { createTurbopufferPartnerSearchProvider } from "./providers/turbopuffer";
import type { PartnerSearchProvider } from "./types";

// Built once per process. A fresh client per call would create a new HTTP
// connection pool each time, paying a TLS handshake on every search.
let cachedSearchProvider: PartnerSearchProvider | null = null;

/**
 * Null until turbopuffer is configured, which is what keeps this dark: every
 * caller falls back to the database search path when there is no provider, so
 * an unset key costs the wider field coverage rather than the partner list.
 */
export function getPartnerSearchProvider(): PartnerSearchProvider | null {
  if (!process.env.TURBOPUFFER_API_KEY?.trim()) {
    return null;
  }

  cachedSearchProvider ??= createTurbopufferPartnerSearchProvider();

  return cachedSearchProvider;
}

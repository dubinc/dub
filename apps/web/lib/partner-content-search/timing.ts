// Stage timing logger for the content search route: one structured console line
// per pipeline stage (elapsed/delta), throttling sub-5ms stages off the allowlist.

const MIN_PARTNER_CONTENT_SEARCH_TIMING_DELTA_MS = 5;
const PARTNER_CONTENT_SEARCH_ALWAYS_LOG_TIMING_STAGES = new Set([
  "query-embedding-complete",
  "vector-candidate-search-complete",
  "vector-candidate-hydration-complete",
  "vector-search-complete",
  "candidate-dedupe-complete",
  "chunk-text-hydration-complete",
  "rerank-complete",
  "partner-candidates-grouped",
  "match-summary-base-queries-complete",
  "match-summary-content-counts-complete",
  "match-summary-recent-content-complete",
  "match-summary-followers-complete",
  "match-summary-aggregation-complete",
  "partner-hydration-complete",
  "response-ready",
]);

export type PartnerContentSearchTimingLogger = (
  stage: string,
  metadata?: Record<string, unknown>,
) => void;

export function createPartnerContentSearchTimingLogger(
  context: Record<string, unknown>,
): PartnerContentSearchTimingLogger {
  const startedAt = Date.now();
  let previousAt = startedAt;

  return (stage, metadata = {}) => {
    const now = Date.now();
    const elapsedMs = now - startedAt;
    const deltaMs = now - previousAt;
    previousAt = now;

    if (
      deltaMs < MIN_PARTNER_CONTENT_SEARCH_TIMING_DELTA_MS &&
      !PARTNER_CONTENT_SEARCH_ALWAYS_LOG_TIMING_STAGES.has(stage)
    ) {
      return;
    }

    console.info("[partner-content-search:timing]", {
      stage,
      elapsedMs,
      deltaMs,
      ...context,
      ...metadata,
    });
  };
}

import { partnerSearchSyncJob } from "@/lib/jobs/handlers/partner-search-sync-job";
import { chunk } from "@dub/utils";
import {
  getPartnerSearchProvider,
  PARTNER_SEARCH_SYNC_BATCH_SIZE,
} from "./search";

/**
 * How long a sync waits before it runs. The delay is what gives deduplication
 * something to collapse: an admin editing one partner three times in a row
 * should produce one write, not three.
 */
export const PARTNER_SEARCH_SYNC_DELAY_SECONDS = 5;

/**
 * Links change far more often than the other document sources, and a link edit
 * only moves `shortLinks` and `destinationUrls`, so they are worth batching
 * harder. Nothing is lost by waiting: the handler re-reads the whole document,
 * so a link sync that runs ten minutes late still picks up every other change
 * that landed in the meantime.
 *
 * Link *creation* should use the default delay instead — a partner's short link
 * is how people search for them, so a newly enrolled partner being unfindable
 * by link for ten minutes is a worse trade than the extra write.
 */
export const PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS = 600;

type PartnerSearchSyncPayload =
  | { type: "enrollments"; enrollmentIds: string[] }
  | { type: "partners"; partnerIds: string[]; programId?: string };

interface QueuePartnerSearchSyncInput {
  /**
   * Enrollments the caller already has IDs for. The only shape that can express
   * a deletion, since the job removes what it cannot read back.
   */
  enrollmentIds?: string[];
  /**
   * Partners whose change fans out to every enrollment they hold, unless
   * `programId` narrows it to one.
   */
  partnerIds?: string[];
  programId?: string;
  delay?: number;
}

function unique(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

/**
 * Collapses repeat syncs of the same subject while one is still pending.
 *
 * Only for single-subject payloads: bulk operations produce chunks whose exact
 * composition never repeats, so a key built from them would never match, and
 * they are not the traffic worth collapsing anyway. Repeated edits to one
 * partner are.
 *
 * The delay is part of the key so a slow link sync cannot suppress a fast one
 * queued behind it, which would drag an interactive edit out to the link delay.
 * The cost is at most one redundant write, and the job is idempotent.
 *
 * If the delay ever exceeds QStash's deduplication retention the collapse stops
 * happening and every edit writes, which is wasteful but still correct.
 */
function buildDeduplicationId(
  payload: PartnerSearchSyncPayload,
  delay: number,
): string | undefined {
  if (payload.type === "enrollments") {
    return payload.enrollmentIds.length === 1
      ? `enrollment:${payload.enrollmentIds[0]}:${delay}`
      : undefined;
  }

  return payload.partnerIds.length === 1
    ? `partner:${payload.partnerIds[0]}:${payload.programId ?? "all"}:${delay}`
    : undefined;
}

/**
 * Queues an index sync for whatever the caller just changed.
 *
 * Never throws. A search index that falls behind costs relevance ranking and
 * the wider field coverage, which the read path already degrades to when no
 * provider is configured; a partner mutation failing because a queue was
 * unreachable would be a far worse outcome. Job dispatch already persists to
 * the database when QStash is unavailable, so reaching the catch here means
 * both paths failed, and the reconciliation sweep is what recovers from it.
 */
export async function queuePartnerSearchSync({
  enrollmentIds,
  partnerIds,
  programId,
  delay = PARTNER_SEARCH_SYNC_DELAY_SECONDS,
}: QueuePartnerSearchSyncInput) {
  // Checked here as well as in the handler so an unconfigured environment does
  // not pay for queueing work that would immediately no-op.
  if (!getPartnerSearchProvider()) {
    return;
  }

  const enrollments = unique(enrollmentIds);
  const partners = unique(partnerIds);

  if (enrollments.length === 0 && partners.length === 0) {
    return;
  }

  const payloads: PartnerSearchSyncPayload[] = [
    ...chunk(enrollments, PARTNER_SEARCH_SYNC_BATCH_SIZE).map((ids) => ({
      type: "enrollments" as const,
      enrollmentIds: ids,
    })),
    ...chunk(partners, PARTNER_SEARCH_SYNC_BATCH_SIZE).map((ids) => ({
      type: "partners" as const,
      partnerIds: ids,
      ...(programId && { programId }),
    })),
  ];

  try {
    await partnerSearchSyncJob.dispatchBatch(payloads, (payload) => {
      const deduplicationId = buildDeduplicationId(payload, delay);

      return {
        delay,
        ...(deduplicationId && { deduplicationId }),
      };
    });
  } catch (error) {
    console.error(
      "[Partner Search] Failed to queue an index sync. The reconciliation sweep will pick this up.",
      error,
    );
  }
}

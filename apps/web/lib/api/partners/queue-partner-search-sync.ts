import { partnerSearchSyncJob } from "@/lib/jobs/handlers/partner-search-sync-job";
import { chunk } from "@dub/utils";
import {
  getPartnerSearchProvider,
  PARTNER_SEARCH_SYNC_BATCH_SIZE,
} from "./search";

/**
 * How long a sync waits before it runs, so the mutation's transaction has
 * settled by the time the job reads the row back.
 *
 * Deliberately not deduplicated. QStash suppresses a repeated key for ten
 * minutes from the first publish, not merely while one is pending, so keying
 * by subject would drop the second of two changes inside that window rather
 * than collapse them. A dropped delete leaves a document nothing can remove.
 * Every edit gets its own job instead, which is safe because the job re-reads
 * current state and is therefore idempotent.
 */
export const PARTNER_SEARCH_SYNC_DELAY_SECONDS = 5;

/**
 * Links change far more often than the other document sources, and a link edit
 * only moves `shortLinks` and `destinationUrls`, so their syncs are spread out
 * rather than run at once. Nothing is lost by waiting: the handler re-reads the
 * whole document, so a late link sync still picks up every other change that
 * landed meanwhile.
 *
 * This no longer reduces the number of writes. It did when these were
 * deduplicated by subject, and that is gone, so what remains is smoothing when
 * a bulk link operation's jobs run. Flow control is what actually caps the load
 * on the provider, which makes this worth revisiting.
 *
 * Link *creation* uses the default delay instead: a partner's short link is how
 * people search for them, so a newly enrolled partner being unfindable by link
 * is a worse trade than running the job sooner.
 */
export const PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS = 300;

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
 * Queues an index sync for whatever the caller just changed.
 *
 * Never throws. A search index that falls behind costs relevance ranking and
 * the wider field coverage, which the read path already degrades to when no
 * provider is configured. A partner mutation failing because a queue was
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
    await partnerSearchSyncJob.dispatchBatch(payloads, () => ({ delay }));
  } catch (error) {
    console.error(
      "[Partner Search] Failed to queue an index sync. The reconciliation sweep will pick this up.",
      error,
    );
  }
}

interface PartnerSearchSyncLink {
  programId: string | null;
  partnerId: string | null;
}

/**
 * Queues a sync for every partner whose links changed.
 *
 * A link reaches the document through its (programId, partnerId) pair, so this
 * groups by program and queues one payload per program rather than one per
 * link. Links carrying neither are ordinary workspace links and hold nothing
 * the document indexes, which is why the bulk link helpers can call this
 * unconditionally: an import of a hundred thousand workspace links queues
 * nothing at all.
 */
export async function queuePartnerSearchSyncForLinks(
  links: PartnerSearchSyncLink[],
  { delay }: { delay?: number } = {},
) {
  const partnersByProgram = new Map<string, Set<string>>();

  for (const { programId, partnerId } of links) {
    if (!programId || !partnerId) {
      continue;
    }

    const partners = partnersByProgram.get(programId) ?? new Set<string>();
    partners.add(partnerId);
    partnersByProgram.set(programId, partners);
  }

  await Promise.all(
    Array.from(partnersByProgram, ([programId, partnerIds]) =>
      queuePartnerSearchSync({
        partnerIds: [...partnerIds],
        programId,
        ...(delay !== undefined && { delay }),
      }),
    ),
  );
}

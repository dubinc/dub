import {
  PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
  PARTNER_SEARCH_SYNC_DELAY_SECONDS,
  QSTASH_DEDUPLICATION_WINDOW_SECONDS,
  queuePartnerSearchSync,
} from "@/lib/api/partners/queue-partner-search-sync";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BATCH_SIZE = 3;

const mocks = vi.hoisted(() => ({
  getPartnerSearchProvider: vi.fn(),
  dispatchBatch: vi.fn(),
}));

vi.mock("@/lib/api/partners/search", () => ({
  PARTNER_SEARCH_SYNC_BATCH_SIZE: 3,
  getPartnerSearchProvider: mocks.getPartnerSearchProvider,
}));

vi.mock("@/lib/jobs/handlers/partner-search-sync-job", () => ({
  partnerSearchSyncJob: {
    dispatchBatch: mocks.dispatchBatch,
  },
}));

/** The options the dispatcher computed for each payload it queued. */
function dispatchedWithOptions() {
  const [payloads, getOptions] = mocks.dispatchBatch.mock.calls[0];

  return payloads.map((payload: unknown, index: number) => ({
    payload,
    options: getOptions?.(payload, index),
  }));
}

describe("queuePartnerSearchSync", () => {
  beforeEach(() => {
    mocks.getPartnerSearchProvider
      .mockReset()
      .mockReturnValue({ name: "turbopuffer" });
    mocks.dispatchBatch.mockReset().mockResolvedValue({
      published: 1,
      deferred: 0,
      failed: 0,
      results: [],
    });
  });

  it("queues nothing when no provider is configured", async () => {
    mocks.getPartnerSearchProvider.mockReturnValue(null);

    await queuePartnerSearchSync({ enrollmentIds: ["pge_1"] });

    expect(mocks.dispatchBatch).not.toHaveBeenCalled();
  });

  it("queues nothing when there is nothing to sync", async () => {
    await queuePartnerSearchSync({ enrollmentIds: [], partnerIds: [] });

    expect(mocks.dispatchBatch).not.toHaveBeenCalled();
  });

  it("deduplicates ids before queueing", async () => {
    await queuePartnerSearchSync({ enrollmentIds: ["pge_1", "pge_1"] });

    expect(mocks.dispatchBatch.mock.calls[0][0]).toEqual([
      { type: "enrollments", enrollmentIds: ["pge_1"] },
    ]);
  });

  it("collapses repeat syncs of a single enrollment", async () => {
    await queuePartnerSearchSync({ enrollmentIds: ["pge_1"] });

    const [{ options }] = dispatchedWithOptions();

    expect(options).toEqual({
      delay: PARTNER_SEARCH_SYNC_DELAY_SECONDS,
      deduplicationId: `enrollment:pge_1:${PARTNER_SEARCH_SYNC_DELAY_SECONDS}`,
    });
  });

  it("scopes a single partner's dedup key by program", async () => {
    await queuePartnerSearchSync({
      partnerIds: ["pn_1"],
      programId: "prog_1",
    });

    const [{ options }] = dispatchedWithOptions();

    expect(options.deduplicationId).toBe(
      `partner:pn_1:prog_1:${PARTNER_SEARCH_SYNC_DELAY_SECONDS}`,
    );
  });

  it("does not deduplicate bulk chunks, whose composition never repeats", async () => {
    await queuePartnerSearchSync({ enrollmentIds: ["pge_1", "pge_2"] });

    const [{ options }] = dispatchedWithOptions();

    expect(options.deduplicationId).toBeUndefined();
  });

  it("keeps a slow link sync from suppressing a fast one", async () => {
    await queuePartnerSearchSync({
      enrollmentIds: ["pge_1"],
      delay: PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
    });
    await queuePartnerSearchSync({ enrollmentIds: ["pge_1"] });

    const slow = mocks.dispatchBatch.mock.calls[0][1](
      { type: "enrollments", enrollmentIds: ["pge_1"] },
      0,
    );
    const fast = mocks.dispatchBatch.mock.calls[1][1](
      { type: "enrollments", enrollmentIds: ["pge_1"] },
      0,
    );

    expect(slow.delay).toBe(PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS);
    expect(fast.delay).toBe(PARTNER_SEARCH_SYNC_DELAY_SECONDS);
    expect(slow.deduplicationId).not.toBe(fast.deduplicationId);
  });

  it("chunks past the batch size so no payload exceeds what the job accepts", async () => {
    await queuePartnerSearchSync({
      enrollmentIds: ["pge_1", "pge_2", "pge_3", "pge_4"],
    });

    expect(mocks.dispatchBatch.mock.calls[0][0]).toEqual([
      { type: "enrollments", enrollmentIds: ["pge_1", "pge_2", "pge_3"] },
      { type: "enrollments", enrollmentIds: ["pge_4"] },
    ]);
  });

  it("queues both shapes when a caller has enrollments and partners", async () => {
    await queuePartnerSearchSync({
      enrollmentIds: ["pge_1"],
      partnerIds: ["pn_1"],
      programId: "prog_1",
    });

    expect(mocks.dispatchBatch.mock.calls[0][0]).toEqual([
      { type: "enrollments", enrollmentIds: ["pge_1"] },
      { type: "partners", partnerIds: ["pn_1"], programId: "prog_1" },
    ]);
  });

  // The delays are only collapsed while QStash still remembers the key, so this
  // is the invariant that keeps the batching real rather than assumed. If the
  // documented window ever shrinks below a delay, this fails here rather than
  // silently costing writes in production.
  it("keeps every delay it deduplicates on inside the deduplication window", () => {
    expect(PARTNER_SEARCH_SYNC_DELAY_SECONDS).toBeLessThan(
      QSTASH_DEDUPLICATION_WINDOW_SECONDS,
    );
    expect(PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS).toBeLessThan(
      QSTASH_DEDUPLICATION_WINDOW_SECONDS,
    );
  });

  it("drops the dedup key past the window rather than claiming a collapse", async () => {
    await queuePartnerSearchSync({
      enrollmentIds: ["pge_1"],
      delay: QSTASH_DEDUPLICATION_WINDOW_SECONDS,
    });

    const [{ options }] = dispatchedWithOptions();

    expect(options.delay).toBe(QSTASH_DEDUPLICATION_WINDOW_SECONDS);
    expect(options.deduplicationId).toBeUndefined();
  });

  it("swallows a dispatch failure so it cannot break the mutation that queued it", async () => {
    mocks.dispatchBatch.mockRejectedValue(new Error("qstash unreachable"));

    await expect(
      queuePartnerSearchSync({ enrollmentIds: ["pge_1"] }),
    ).resolves.toBeUndefined();
  });

  it("never builds a payload larger than the job's batch size", async () => {
    await queuePartnerSearchSync({
      partnerIds: Array.from({ length: 7 }, (_, index) => `pn_${index}`),
    });

    for (const payload of mocks.dispatchBatch.mock.calls[0][0]) {
      expect(payload.partnerIds.length).toBeLessThanOrEqual(BATCH_SIZE);
    }
  });
});

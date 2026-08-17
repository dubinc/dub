import {
  PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
  PARTNER_SEARCH_SYNC_DELAY_SECONDS,
  queuePartnerSearchSync,
  queuePartnerSearchSyncForLinks,
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



  // QStash suppresses a repeated key for ten minutes from the first publish,
  // not merely while one is pending. Keying by subject would therefore drop the
  // second of two changes inside that window, and a dropped delete leaves a
  // document nothing can remove. Every change gets its own job instead.
  it("never deduplicates, so a later change cannot be dropped", async () => {
    await queuePartnerSearchSync({ enrollmentIds: ["pge_1"] });
    await queuePartnerSearchSync({ enrollmentIds: ["pge_1"] });

    expect(mocks.dispatchBatch).toHaveBeenCalledTimes(2);

    for (const [, getOptions] of mocks.dispatchBatch.mock.calls) {
      const options = getOptions(
        { type: "enrollments", enrollmentIds: ["pge_1"] },
        0,
      );
      expect(options.deduplicationId).toBeUndefined();
      expect(options.delay).toBe(PARTNER_SEARCH_SYNC_DELAY_SECONDS);
    }
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

describe("queuePartnerSearchSyncForLinks", () => {
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

  // The bulk link helpers call this on every write, including workspace-link
  // imports of a hundred thousand rows. Those carry no partner, so this must
  // cost nothing rather than being guarded at each call site.
  it("queues nothing for links with no program or partner", async () => {
    await queuePartnerSearchSyncForLinks([
      { programId: null, partnerId: null },
      { programId: "prog_1", partnerId: null },
      { programId: null, partnerId: "pn_1" },
    ]);

    expect(mocks.dispatchBatch).not.toHaveBeenCalled();
  });

  it("queues one payload per program, not per link", async () => {
    await queuePartnerSearchSyncForLinks([
      { programId: "prog_1", partnerId: "pn_1" },
      { programId: "prog_1", partnerId: "pn_2" },
      { programId: "prog_1", partnerId: "pn_1" },
      { programId: "prog_2", partnerId: "pn_3" },
    ]);

    expect(mocks.dispatchBatch).toHaveBeenCalledTimes(2);

    const queued = mocks.dispatchBatch.mock.calls.map(([payloads]) => payloads[0]);

    expect(queued).toEqual([
      { type: "partners", partnerIds: ["pn_1", "pn_2"], programId: "prog_1" },
      { type: "partners", partnerIds: ["pn_3"], programId: "prog_2" },
    ]);
  });

  it("passes the delay through so link edits can batch harder than creations", async () => {
    await queuePartnerSearchSyncForLinks(
      [{ programId: "prog_1", partnerId: "pn_1" }],
      { delay: PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS },
    );

    const [, getOptions] = mocks.dispatchBatch.mock.calls[0];

    expect(getOptions({ type: "partners", partnerIds: ["pn_1"] }, 0).delay).toBe(
      PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
    );
  });

  it("defaults to the interactive delay when none is given", async () => {
    await queuePartnerSearchSyncForLinks([
      { programId: "prog_1", partnerId: "pn_1" },
    ]);

    const [, getOptions] = mocks.dispatchBatch.mock.calls[0];

    expect(getOptions({ type: "partners", partnerIds: ["pn_1"] }, 0).delay).toBe(
      PARTNER_SEARCH_SYNC_DELAY_SECONDS,
    );
  });

  it("queues nothing for an empty link set", async () => {
    await queuePartnerSearchSyncForLinks([]);

    expect(mocks.dispatchBatch).not.toHaveBeenCalled();
  });
});

describe("queuePartnerSearchSyncForLinks: ownership transfer", () => {
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

  // A link update can rewrite partnerId, so the former owner has to be
  // re-serialized without the link. Syncing only the new owner would leave it
  // searchable under a partner who no longer has it.
  it("syncs both owners when a link moves between partners", async () => {
    await queuePartnerSearchSyncForLinks([
      { programId: "prog_1", partnerId: "pn_old" },
      { programId: "prog_1", partnerId: "pn_new" },
    ]);

    expect(mocks.dispatchBatch.mock.calls[0][0]).toEqual([
      {
        type: "partners",
        partnerIds: ["pn_old", "pn_new"],
        programId: "prog_1",
      },
    ]);
  });

  it("syncs both programs when a link moves across programs", async () => {
    await queuePartnerSearchSyncForLinks([
      { programId: "prog_old", partnerId: "pn_1" },
      { programId: "prog_new", partnerId: "pn_1" },
    ]);

    expect(mocks.dispatchBatch).toHaveBeenCalledTimes(2);
  });

  // An unowned link gaining a partner has no former owner to re-serialize.
  it("skips the null side when a link gains its first owner", async () => {
    await queuePartnerSearchSyncForLinks([
      { programId: null, partnerId: null },
      { programId: "prog_1", partnerId: "pn_1" },
    ]);

    expect(mocks.dispatchBatch.mock.calls[0][0]).toEqual([
      { type: "partners", partnerIds: ["pn_1"], programId: "prog_1" },
    ]);
  });
});

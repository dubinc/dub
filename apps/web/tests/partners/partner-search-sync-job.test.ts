import { partnerSearchSyncJob } from "@/lib/jobs/handlers/partner-search-sync-job";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A small batch size keeps the pagination cases readable.
const BATCH_SIZE = 3;

const mocks = vi.hoisted(() => ({
  getPartnerSearchProvider: vi.fn(),
  syncPartnerSearchDocuments: vi.fn(),
  findPartnerSearchSyncEnrollmentIds: vi.fn(),
}));

vi.mock("@/lib/api/partners/search", () => ({
  PARTNER_SEARCH_SYNC_BATCH_SIZE: 3,
  getPartnerSearchProvider: mocks.getPartnerSearchProvider,
  syncPartnerSearchDocuments: mocks.syncPartnerSearchDocuments,
  findPartnerSearchSyncEnrollmentIds: mocks.findPartnerSearchSyncEnrollmentIds,
}));

const searchProvider = { name: "turbopuffer" };

describe("partnerSearchSyncJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getPartnerSearchProvider.mockReset().mockReturnValue(searchProvider);
    mocks.syncPartnerSearchDocuments
      .mockReset()
      .mockResolvedValue({ upserted: 0, deleted: 0 });
    mocks.findPartnerSearchSyncEnrollmentIds.mockReset().mockResolvedValue([]);
  });

  it("skips entirely when no provider is configured", async () => {
    mocks.getPartnerSearchProvider.mockReturnValue(null);

    await partnerSearchSyncJob.execute({
      type: "enrollments",
      enrollmentIds: ["pge_1"],
    });

    expect(mocks.syncPartnerSearchDocuments).not.toHaveBeenCalled();
    expect(mocks.findPartnerSearchSyncEnrollmentIds).not.toHaveBeenCalled();
  });

  it("syncs the enrollment ids it is given", async () => {
    await partnerSearchSyncJob.execute({
      type: "enrollments",
      enrollmentIds: ["pge_1", "pge_2"],
    });

    expect(mocks.syncPartnerSearchDocuments).toHaveBeenCalledWith({
      enrollmentIds: ["pge_1", "pge_2"],
      searchProvider,
    });
    expect(mocks.findPartnerSearchSyncEnrollmentIds).not.toHaveBeenCalled();
  });

  it("resolves a partner fan-out before syncing", async () => {
    mocks.findPartnerSearchSyncEnrollmentIds.mockResolvedValue([
      "pge_1",
      "pge_2",
    ]);

    await partnerSearchSyncJob.execute({
      type: "partners",
      partnerIds: ["pn_1"],
    });

    expect(mocks.findPartnerSearchSyncEnrollmentIds).toHaveBeenCalledWith({
      partnerIds: ["pn_1"],
      programId: undefined,
      after: undefined,
      take: BATCH_SIZE,
    });
    expect(mocks.syncPartnerSearchDocuments).toHaveBeenCalledWith({
      enrollmentIds: ["pge_1", "pge_2"],
      searchProvider,
    });
  });

  it("continues from the last enrollment when a page comes back full", async () => {
    const dispatch = vi
      .spyOn(partnerSearchSyncJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    mocks.findPartnerSearchSyncEnrollmentIds.mockResolvedValue([
      "pge_1",
      "pge_2",
      "pge_3",
    ]);

    await partnerSearchSyncJob.execute({
      type: "partners",
      partnerIds: ["pn_1"],
      programId: "prog_1",
    });

    expect(dispatch).toHaveBeenCalledWith(
      {
        type: "partners",
        partnerIds: ["pn_1"],
        programId: "prog_1",
        after: "pge_3",
      },
      { delay: 1 },
    );
  });

  it("stops when a page comes back short", async () => {
    const dispatch = vi
      .spyOn(partnerSearchSyncJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    mocks.findPartnerSearchSyncEnrollmentIds.mockResolvedValue([
      "pge_1",
      "pge_2",
    ]);

    await partnerSearchSyncJob.execute({
      type: "partners",
      partnerIds: ["pn_1"],
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not sync or continue when a partner has no enrollments", async () => {
    const dispatch = vi
      .spyOn(partnerSearchSyncJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    mocks.findPartnerSearchSyncEnrollmentIds.mockResolvedValue([]);

    await partnerSearchSyncJob.execute({
      type: "partners",
      partnerIds: ["pn_1"],
    });

    expect(mocks.syncPartnerSearchDocuments).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a payload with no ids, so an empty fan-out cannot be queued", async () => {
    await expect(
      partnerSearchSyncJob.execute({ type: "enrollments", enrollmentIds: [] }),
    ).rejects.toThrow();

    await expect(
      partnerSearchSyncJob.execute({ type: "partners", partnerIds: [] }),
    ).rejects.toThrow();
  });

  it("rejects a payload larger than one batch", async () => {
    await expect(
      partnerSearchSyncJob.execute({
        type: "enrollments",
        enrollmentIds: ["pge_1", "pge_2", "pge_3", "pge_4"],
      }),
    ).rejects.toThrow();
  });

  it("rejects an unknown payload shape", async () => {
    await expect(
      partnerSearchSyncJob.execute({ enrollmentIds: ["pge_1"] }),
    ).rejects.toThrow();
  });
});

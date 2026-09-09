import { partnerSearchSyncJob } from "@/lib/jobs/handlers/partner-search-sync-job";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A small batch size keeps the pagination cases readable.
const BATCH_SIZE = 3;

const mocks = vi.hoisted(() => ({
  getPartnerSearchProvider: vi.fn(),
  syncPartnerSearchDocuments: vi.fn(),
  syncPartnerEnrollments: vi.fn(),
}));

vi.mock("@/lib/api/partners/search", () => ({
  PARTNER_SEARCH_SYNC_BATCH_SIZE: 3,
  getPartnerSearchProvider: mocks.getPartnerSearchProvider,
  syncPartnerSearchDocuments: mocks.syncPartnerSearchDocuments,
  syncPartnerEnrollments: mocks.syncPartnerEnrollments,
}));

const searchProvider = { name: "turbopuffer" };

describe("partnerSearchSyncJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getPartnerSearchProvider.mockReset().mockReturnValue(searchProvider);
    mocks.syncPartnerSearchDocuments
      .mockReset()
      .mockResolvedValue({ upserted: 0, deleted: 0 });
    mocks.syncPartnerEnrollments
      .mockReset()
      .mockResolvedValue({ upserted: 0, lastEnrollmentId: null });
  });

  it("skips entirely when no provider is configured", async () => {
    mocks.getPartnerSearchProvider.mockReturnValue(null);

    await partnerSearchSyncJob.execute({
      type: "enrollments",
      enrollmentIds: ["pge_1"],
    });

    expect(mocks.syncPartnerSearchDocuments).not.toHaveBeenCalled();
    expect(mocks.syncPartnerEnrollments).not.toHaveBeenCalled();
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
    expect(mocks.syncPartnerEnrollments).not.toHaveBeenCalled();
  });

  it("syncs a partner fan-out in one read", async () => {
    mocks.syncPartnerEnrollments.mockResolvedValue({
      upserted: 2,
      lastEnrollmentId: "pge_2",
    });

    await partnerSearchSyncJob.execute({
      type: "partners",
      partnerIds: ["pn_1"],
    });

    expect(mocks.syncPartnerEnrollments).toHaveBeenCalledWith({
      partnerIds: ["pn_1"],
      programId: undefined,
      after: undefined,
      take: BATCH_SIZE,
      searchProvider,
    });
    expect(mocks.syncPartnerSearchDocuments).not.toHaveBeenCalled();
  });

  it("continues from the last enrollment when a page comes back full", async () => {
    const dispatch = vi
      .spyOn(partnerSearchSyncJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    mocks.syncPartnerEnrollments.mockResolvedValue({
      upserted: BATCH_SIZE,
      lastEnrollmentId: "pge_3",
    });

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

    mocks.syncPartnerEnrollments.mockResolvedValue({
      upserted: 2,
      lastEnrollmentId: "pge_2",
    });

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

    mocks.syncPartnerEnrollments.mockResolvedValue({
      upserted: 0,
      lastEnrollmentId: null,
    });

    await partnerSearchSyncJob.execute({
      type: "partners",
      partnerIds: ["pn_1"],
    });

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

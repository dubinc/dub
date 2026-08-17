import { partnerSearchSweepJob } from "@/lib/jobs/handlers/partner-search-sweep-job";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPartnerSearchProvider: vi.fn(),
  sweepPartnerSearch: vi.fn(),
}));

vi.mock("@/lib/api/partners/search", () => ({
  getPartnerSearchProvider: mocks.getPartnerSearchProvider,
  sweepPartnerSearch: mocks.sweepPartnerSearch,
}));

describe("partnerSearchSweepJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getPartnerSearchProvider
      .mockReset()
      .mockReturnValue({ name: "turbopuffer" });
    mocks.sweepPartnerSearch.mockReset().mockResolvedValue({
      processed: 0,
      lastDocumentId: null,
      done: true,
    });
  });

  it("skips entirely when no provider is configured", async () => {
    mocks.getPartnerSearchProvider.mockReturnValue(null);

    await partnerSearchSweepJob.execute({});

    expect(mocks.sweepPartnerSearch).not.toHaveBeenCalled();
  });

  it("stops when the pass is done", async () => {
    const dispatch = vi
      .spyOn(partnerSearchSweepJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    mocks.sweepPartnerSearch.mockResolvedValue({
      processed: 12,
      lastDocumentId: "pge_12",
      done: true,
    });

    await partnerSearchSweepJob.execute({});

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("carries the cursor and running total to the next hop", async () => {
    const dispatch = vi
      .spyOn(partnerSearchSweepJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    mocks.sweepPartnerSearch.mockResolvedValue({
      processed: 20,
      lastDocumentId: "pge_20",
      done: false,
    });

    await partnerSearchSweepJob.execute({ after: "pge_10", processed: 30 });

    expect(mocks.sweepPartnerSearch).toHaveBeenCalledWith({ after: "pge_10" });
    expect(dispatch).toHaveBeenCalledWith(
      { after: "pge_20", processed: 50 },
      { delay: 1 },
    );
  });

});

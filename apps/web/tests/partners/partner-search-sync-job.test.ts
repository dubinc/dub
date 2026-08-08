import {
  enqueuePartnerSearchSyncJob,
  partnerSearchSyncJob,
} from "@/lib/jobs/handlers/partner-search-sync-job";
import { loadJob } from "@/lib/jobs/registry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncDocuments: vi.fn(),
  syncPartners: vi.fn(),
  getProvider: vi.fn(),
}));

vi.mock("@/lib/api/partners/search", () => ({
  syncPartnerSearchDocuments: mocks.syncDocuments,
  syncPartnerSearchDocumentsByPartnerIds: mocks.syncPartners,
}));

vi.mock("@/lib/api/partners/search/provider", () => ({
  getPartnerSearchProvider: mocks.getProvider,
}));

describe("partnerSearchSyncJob", () => {
  beforeEach(() => {
    mocks.syncDocuments.mockReset();
    mocks.syncPartners.mockReset();
    mocks.getProvider.mockReset();
    mocks.getProvider.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("syncs document and partner IDs", async () => {
    await partnerSearchSyncJob.execute({
      documentIds: ["pge_1"],
      partnerIds: ["pn_1"],
    });

    expect(mocks.syncDocuments).toHaveBeenCalledWith(["pge_1"]);
    expect(mocks.syncPartners).toHaveBeenCalledWith(["pn_1"]);
  });

  it("is available through the job registry", async () => {
    await expect(loadJob("partner-search-sync-job")).resolves.toBe(
      partnerSearchSyncJob,
    );
  });

  it("requires at least one ID", async () => {
    await expect(partnerSearchSyncJob.execute({})).rejects.toThrow(
      "At least one document or partner ID is required.",
    );
  });

  it("does not enqueue when no provider is configured", async () => {
    const dispatch = vi.spyOn(partnerSearchSyncJob, "dispatch");

    await enqueuePartnerSearchSyncJob({ documentIds: ["pge_1"] });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("enqueues when a provider is configured", async () => {
    mocks.getProvider.mockReturnValue({});
    const dispatch = vi
      .spyOn(partnerSearchSyncJob, "dispatch")
      .mockResolvedValue({ status: "published", messageId: "msg_1" });

    await enqueuePartnerSearchSyncJob({ partnerIds: ["pn_1"] });

    expect(dispatch).toHaveBeenCalledWith({ partnerIds: ["pn_1"] });
  });
});

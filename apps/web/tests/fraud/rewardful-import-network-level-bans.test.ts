import { importPartners } from "@/lib/rewardful/import-partners";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  programFindUniqueOrThrow: vi.fn(),
  partnerUpsert: vi.fn(),
  upsertImportedProgramEnrollment: vi.fn(),
  approveLinkedApplication: vi.fn(),
  bulkCreateLinks: vi.fn(),
  queuePartnerSearchSync: vi.fn(),
  detectAndRecordNetworkLevelBans: vi.fn(),
  logImportError: vi.fn(),
  redisHset: vi.fn(),
  redisHdel: vi.fn(),
  listPartners: vi.fn(),
  getCredentials: vi.fn(),
  queue: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: { findUniqueOrThrow: mocks.programFindUniqueOrThrow },
    partner: { upsert: mocks.partnerUpsert },
  },
}));

vi.mock("@/lib/api/partners/upsert-imported-program-enrollment", () => ({
  upsertImportedProgramEnrollment: mocks.upsertImportedProgramEnrollment,
}));

vi.mock("@/lib/program-applications/approve-linked-application", () => ({
  approveLinkedApplication: mocks.approveLinkedApplication,
}));

vi.mock("@/lib/api/links", () => ({
  bulkCreateLinks: mocks.bulkCreateLinks,
}));

vi.mock("@/lib/api/partners/queue-partner-search-sync", () => ({
  queuePartnerSearchSync: mocks.queuePartnerSearchSync,
}));

vi.mock("@/lib/api/fraud/detect-network-level-bans", () => ({
  detectAndRecordNetworkLevelBans: mocks.detectAndRecordNetworkLevelBans,
}));

vi.mock("@/lib/tinybird/log-import-error", () => ({
  logImportError: mocks.logImportError,
}));

vi.mock("@/lib/upstash", () => ({
  redis: { hset: mocks.redisHset, hdel: mocks.redisHdel },
}));

vi.mock("@/lib/rewardful/api", () => ({
  RewardfulApi: class {
    listPartners = mocks.listPartners;
  },
}));

vi.mock("@/lib/rewardful/importer", () => ({
  REWARDFUL_MAX_BATCHES: 10,
  rewardfulImporter: {
    getCredentials: mocks.getCredentials,
    queue: mocks.queue,
  },
}));

const PROGRAM_ID = "prog_importing";
const CAMPAIGN_ID = "camp_1";

const program = {
  id: PROGRAM_ID,
  workspaceId: "ws_1",
  domain: "acme.link",
  url: "https://acme.com",
  defaultFolderId: "fold_1",
  groups: [
    {
      id: "grp_1",
      slug: `rewardful-${CAMPAIGN_ID}`,
      clickRewardId: null,
      leadRewardId: null,
      saleRewardId: null,
      referralRewardId: null,
      customRewardId: null,
      discountId: null,
      partnerGroupDefaultLinks: [],
    },
  ],
};

const payload = {
  importId: "import_1",
  userId: "user_1",
  programId: PROGRAM_ID,
  campaignIds: [CAMPAIGN_ID],
  action: "import-partners" as const,
};

function affiliate(id: string) {
  return {
    id,
    email: `${id}@example.com`,
    first_name: "Test",
    last_name: "Partner",
    state: "active",
    leads: 1,
    campaign: { id: CAMPAIGN_ID },
    links: [{ token: id }],
  };
}

describe("Rewardful importPartners network-level ban check", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.programFindUniqueOrThrow.mockResolvedValue(program);
    mocks.getCredentials.mockResolvedValue({ token: "token" });
    mocks.partnerUpsert.mockImplementation(({ where }) =>
      Promise.resolve({
        id: `pn_${where.email.split("@")[0]}`,
        email: where.email,
      }),
    );
    mocks.upsertImportedProgramEnrollment.mockImplementation(({ partnerId }) =>
      Promise.resolve({
        enrollment: {
          id: `pge_${partnerId}`,
          partnerId,
          applicationId: null,
          groupId: "grp_1",
          discountId: null,
          links: [],
        },
        preservedBan: false,
      }),
    );
  });

  it("passes a partner whose link creation throws to the ban check", async () => {
    mocks.listPartners.mockResolvedValueOnce([
      affiliate("healthy"),
      affiliate("broken"),
    ]);
    mocks.bulkCreateLinks.mockImplementation(({ links }) =>
      links[0].partnerId === "pn_broken"
        ? Promise.reject(new Error("link creation failed"))
        : Promise.resolve([]),
    );

    await expect(importPartners(payload)).rejects.toThrow(
      "link creation failed",
    );

    expect(mocks.detectAndRecordNetworkLevelBans).toHaveBeenCalledTimes(1);
    expect(mocks.detectAndRecordNetworkLevelBans).toHaveBeenCalledWith({
      programId: PROGRAM_ID,
      partnerIds: expect.arrayContaining(["pn_healthy", "pn_broken"]),
    });
    expect(mocks.queuePartnerSearchSync).toHaveBeenCalledWith({
      programId: PROGRAM_ID,
      partnerIds: expect.arrayContaining(["pn_healthy", "pn_broken"]),
    });

    // Only the partner that finished gets the coupon import mapping
    expect(mocks.redisHset).toHaveBeenCalledWith(
      `rewardful:affiliates:${PROGRAM_ID}`,
      { healthy: expect.objectContaining({ partnerId: "pn_healthy" }) },
    );

    // The page fails, so it is not marked done
    expect(mocks.queue).not.toHaveBeenCalled();
  });

  it("passes a partner whose application approval throws to the ban check", async () => {
    mocks.listPartners.mockResolvedValueOnce([affiliate("broken")]);
    mocks.approveLinkedApplication.mockRejectedValue(
      new Error("approval failed"),
    );

    await expect(importPartners(payload)).rejects.toThrow("approval failed");

    expect(mocks.detectAndRecordNetworkLevelBans).toHaveBeenCalledWith({
      programId: PROGRAM_ID,
      partnerIds: ["pn_broken"],
    });
  });

  it("passes a partner to the ban check when the program has no domain", async () => {
    mocks.programFindUniqueOrThrow.mockResolvedValue({
      ...program,
      domain: null,
    });
    mocks.listPartners
      .mockResolvedValueOnce([affiliate("nodomain")])
      .mockResolvedValueOnce([]);

    await importPartners(payload);

    expect(mocks.bulkCreateLinks).not.toHaveBeenCalled();
    expect(mocks.detectAndRecordNetworkLevelBans).toHaveBeenCalledWith({
      programId: PROGRAM_ID,
      partnerIds: ["pn_nodomain"],
    });
    expect(mocks.queue).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import-affiliate-coupons" }),
    );
  });

  it("removes a preserved ban from the coupon map but still ban-checks it", async () => {
    mocks.listPartners
      .mockResolvedValueOnce([affiliate("healthy"), affiliate("banned")])
      .mockResolvedValueOnce([]);
    mocks.bulkCreateLinks.mockResolvedValue([]);
    mocks.upsertImportedProgramEnrollment.mockImplementation(({ partnerId }) =>
      Promise.resolve({
        enrollment: {
          id: `pge_${partnerId}`,
          partnerId,
          applicationId: null,
          groupId: "grp_1",
          discountId: null,
          links: [],
        },
        preservedBan: partnerId === "pn_banned",
      }),
    );

    await importPartners(payload);

    expect(mocks.redisHdel).toHaveBeenCalledTimes(1);
    expect(mocks.redisHdel).toHaveBeenCalledWith(
      `rewardful:affiliates:${PROGRAM_ID}`,
      "banned",
    );
    expect(mocks.redisHset).toHaveBeenCalledWith(
      `rewardful:affiliates:${PROGRAM_ID}`,
      { healthy: expect.objectContaining({ partnerId: "pn_healthy" }) },
    );
    expect(mocks.detectAndRecordNetworkLevelBans).toHaveBeenCalledWith({
      programId: PROGRAM_ID,
      partnerIds: expect.arrayContaining(["pn_healthy", "pn_banned"]),
    });
  });

  it("does not call hdel when no ban was preserved", async () => {
    mocks.listPartners
      .mockResolvedValueOnce([affiliate("healthy")])
      .mockResolvedValueOnce([]);
    mocks.bulkCreateLinks.mockResolvedValue([]);

    await importPartners(payload);

    expect(mocks.redisHdel).not.toHaveBeenCalled();
  });
});

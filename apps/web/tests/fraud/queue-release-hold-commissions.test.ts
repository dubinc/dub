import { FraudEventStatus } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  batchJSON: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fraudEventGroup: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/lib/cron", () => ({
  PRISMA_UPDATEMANY_LIMIT: 1000,
  qstash: {
    batchJSON: mocks.batchJSON,
  },
}));

vi.mock("@/lib/actions/partners/trigger-aggregate-due-commissions", () => ({
  triggerAggregateDueCommissionsCronJob: vi.fn(),
}));

vi.mock("@/lib/api/commissions/track-commission-update-activity-log", () => ({
  trackCommissionStatusUpdate: vi.fn(),
}));

vi.mock("@/lib/api/partners/sync-total-commissions", () => ({
  syncTotalCommissions: vi.fn(),
}));

vi.mock("@/lib/api/workflows/execute-workflows", () => ({
  executeWorkflows: vi.fn(),
}));

vi.mock("@dub/utils", async () => {
  const actual = await vi.importActual<typeof import("@dub/utils")>("@dub/utils");
  return {
    ...actual,
    APP_DOMAIN_WITH_NGROK: "https://example.com",
  };
});

const { queueReleaseHoldCommissions } = await import(
  "@/lib/api/fraud/release-hold-commissions"
);

describe("queueReleaseHoldCommissions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues release jobs using each group's partnerId by default", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "frg_source",
        programId: "prog_1",
        partnerId: "pn_source",
      },
      {
        id: "frg_target",
        programId: "prog_1",
        partnerId: "pn_target",
      },
    ]);
    mocks.batchJSON.mockResolvedValue(undefined);

    const jobCount = await queueReleaseHoldCommissions([
      "frg_source",
      "frg_target",
    ]);

    expect(jobCount).toBe(2);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["frg_source", "frg_target"] },
        status: {
          in: [FraudEventStatus.resolved, FraudEventStatus.expired],
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
    });
    expect(mocks.batchJSON).toHaveBeenCalledWith([
      {
        url: "https://example.com/api/cron/fraud/release-hold-commissions",
        method: "POST",
        body: {
          programId: "prog_1",
          partnerId: "pn_source",
          resolvedGroupIds: ["frg_source"],
        },
      },
      {
        url: "https://example.com/api/cron/fraud/release-hold-commissions",
        method: "POST",
        body: {
          programId: "prog_1",
          partnerId: "pn_target",
          resolvedGroupIds: ["frg_target"],
        },
      },
    ]);
  });

  it("collapses jobs onto releasePartnerId after an account merge", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "frg_source",
        programId: "prog_1",
        partnerId: "pn_source",
      },
      {
        id: "frg_target",
        programId: "prog_1",
        partnerId: "pn_target",
      },
    ]);
    mocks.batchJSON.mockResolvedValue(undefined);

    const jobCount = await queueReleaseHoldCommissions(
      ["frg_source", "frg_target"],
      { releasePartnerId: "pn_target" },
    );

    expect(jobCount).toBe(1);
    expect(mocks.batchJSON).toHaveBeenCalledWith([
      {
        url: "https://example.com/api/cron/fraud/release-hold-commissions",
        method: "POST",
        body: {
          programId: "prog_1",
          partnerId: "pn_target",
          resolvedGroupIds: ["frg_source", "frg_target"],
        },
      },
    ]);
  });
});

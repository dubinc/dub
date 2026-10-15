import { FraudEventStatus } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  queueReleaseHoldCommissions: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fraudEventGroup: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/lib/api/fraud/release-hold-commissions", () => ({
  queueReleaseHoldCommissions: mocks.queueReleaseHoldCommissions,
}));

const { resolveFraudGroups } = await import(
  "@/lib/api/fraud/resolve-fraud-groups"
);

describe("resolveFraudGroups", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not queue hold-commission release by default", async () => {
    mocks.findMany.mockResolvedValue([{ id: "frg_1" }]);
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await resolveFraudGroups({
      where: { partnerId: "pn_1" },
      resolutionReason: "resolved",
    });

    expect(mocks.queueReleaseHoldCommissions).not.toHaveBeenCalled();
  });

  it("queues release against releasePartnerId when requested", async () => {
    mocks.findMany.mockResolvedValue([{ id: "frg_1" }, { id: "frg_2" }]);
    mocks.updateMany.mockResolvedValue({ count: 2 });
    mocks.queueReleaseHoldCommissions.mockResolvedValue(1);

    const count = await resolveFraudGroups({
      where: { partnerId: "pn_source" },
      resolutionReason: "merged",
      releaseHoldCommissions: true,
      releasePartnerId: "pn_target",
    });

    expect(count).toBe(2);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["frg_1", "frg_2"] },
        status: FraudEventStatus.pending,
      },
      data: {
        userId: undefined,
        resolutionReason: "merged",
        resolvedAt: expect.any(Date),
        status: FraudEventStatus.resolved,
      },
    });
    expect(mocks.queueReleaseHoldCommissions).toHaveBeenCalledWith(
      ["frg_1", "frg_2"],
      { releasePartnerId: "pn_target" },
    );
  });
});

import { detectAndRecordNetworkLevelBans } from "@/lib/api/fraud/detect-network-level-bans";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { FraudRuleType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fraudRuleFindMany: vi.fn(),
  fraudAlertFindMany: vi.fn(),
  createFraudEvents: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fraudRule: { findMany: mocks.fraudRuleFindMany },
    fraudAlert: { findMany: mocks.fraudAlertFindMany },
  },
}));

vi.mock("@/lib/api/fraud/create-fraud-events", () => ({
  createFraudEvents: mocks.createFraudEvents,
}));

const PROGRAM_ID = "prog_inviting";
const BANNING_PROGRAM_ID = "prog_banning";
const BANNED_PARTNER_ID = "pn_banned";
const CLEAN_PARTNER_ID = "pn_clean";
const BANNED_AT = new Date("2026-10-01");

const programBanAlert = {
  partnerId: BANNED_PARTNER_ID,
  programId: BANNING_PROGRAM_ID,
  source: "program",
  reviewedAt: BANNED_AT,
  createdAt: BANNED_AT,
  programEnrollment: {
    bannedReason: "fraud",
    bannedAt: BANNED_AT,
    application: null,
  },
};

describe("detectAndRecordNetworkLevelBans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fraudRuleFindMany.mockResolvedValue([]);
    mocks.fraudAlertFindMany.mockResolvedValue([]);
  });

  it("checks all enrolled partners in one query and flags the banned ones", async () => {
    mocks.fraudAlertFindMany.mockResolvedValue([programBanAlert]);

    await detectAndRecordNetworkLevelBans({
      programId: PROGRAM_ID,
      partnerIds: [BANNED_PARTNER_ID, CLEAN_PARTNER_ID],
    });

    expect(mocks.fraudAlertFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.fraudAlertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partnerId: { in: [BANNED_PARTNER_ID, CLEAN_PARTNER_ID] },
          status: "confirmed",
          // Only active enrollments with risk monitoring on are alerted
          partner: {
            programs: {
              some: {
                programId: PROGRAM_ID,
                status: { notIn: INACTIVE_ENROLLMENT_STATUSES },
                riskMonitoringDisabledAt: null,
              },
            },
          },
        }),
      }),
    );
    expect(mocks.createFraudEvents).toHaveBeenCalledWith([
      {
        programId: PROGRAM_ID,
        partnerId: BANNED_PARTNER_ID,
        type: FraudRuleType.partnerCrossProgramBan,
        sourceProgramId: BANNING_PROGRAM_ID,
        metadata: {
          bannedReason: "fraud",
          bannedAt: BANNED_AT,
        },
      },
    ]);
  });

  it("does nothing when no partners were enrolled", async () => {
    await detectAndRecordNetworkLevelBans({
      programId: PROGRAM_ID,
      partnerIds: [],
    });

    expect(mocks.fraudRuleFindMany).not.toHaveBeenCalled();
    expect(mocks.fraudAlertFindMany).not.toHaveBeenCalled();
    expect(mocks.createFraudEvents).not.toHaveBeenCalled();
  });

  it("does not check bans when the rule is disabled", async () => {
    mocks.fraudRuleFindMany.mockResolvedValue([
      {
        programId: PROGRAM_ID,
        type: FraudRuleType.partnerCrossProgramBan,
        disabledAt: new Date(),
        config: null,
      },
    ]);

    await detectAndRecordNetworkLevelBans({
      programId: PROGRAM_ID,
      partnerIds: [BANNED_PARTNER_ID],
    });

    expect(mocks.fraudAlertFindMany).not.toHaveBeenCalled();
    expect(mocks.createFraudEvents).not.toHaveBeenCalled();
  });

  it("does not throw when the check fails, so the enrollment is not blocked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fraudAlertFindMany.mockRejectedValue(new Error("Database error"));

    await expect(
      detectAndRecordNetworkLevelBans({
        programId: PROGRAM_ID,
        partnerIds: [BANNED_PARTNER_ID],
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createFraudEvents).not.toHaveBeenCalled();
  });
});

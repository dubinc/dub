import { detectAndRecordFraudApplication } from "@/lib/api/fraud/detect-record-fraud-application";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { FraudRuleType, ProgramEnrollmentStatus } from "@prisma/client";
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

const PROGRAM_ID = "prog_applying";
const BANNING_PROGRAM_ID = "prog_banning";
const PARTNER_ID = "pn_banned";
const BANNED_AT = new Date("2026-10-01");
const REVIEWED_AT = new Date("2026-10-02");

const context = {
  program: { id: PROGRAM_ID },
  partner: {
    id: PARTNER_ID,
    payoutMethodHash: null,
    cryptoWalletAddress: null,
  },
};

const programBanAlert = {
  partnerId: PARTNER_ID,
  programId: BANNING_PROGRAM_ID,
  source: "program",
  reviewedAt: REVIEWED_AT,
  createdAt: BANNED_AT,
  programEnrollment: {
    bannedReason: "tos_violation",
    bannedAt: BANNED_AT,
    application: null,
  },
};

const adminBanAlert = {
  partnerId: PARTNER_ID,
  programId: BANNING_PROGRAM_ID,
  source: "admin",
  reviewedAt: REVIEWED_AT,
  createdAt: BANNED_AT,
  programEnrollment: {
    bannedReason: null,
    bannedAt: null,
    application: null,
  },
};

function createdEvents() {
  return mocks.createFraudEvents.mock.calls[0][0];
}

describe("detectAndRecordFraudApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fraudRuleFindMany.mockResolvedValue([]);
    mocks.fraudAlertFindMany.mockResolvedValue([]);
  });

  it("flags an applicant with a confirmed program ban", async () => {
    mocks.fraudAlertFindMany.mockResolvedValue([programBanAlert]);

    await detectAndRecordFraudApplication({ context });

    expect(mocks.fraudAlertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partnerId: { in: [PARTNER_ID] },
          status: "confirmed",
          // Lifted program bans must not flag new applications
          OR: [
            { source: "admin" },
            {
              programEnrollment: {
                status: ProgramEnrollmentStatus.banned,
              },
            },
          ],
        }),
      }),
    );
    expect(createdEvents()).toEqual([
      {
        programId: PROGRAM_ID,
        partnerId: PARTNER_ID,
        type: FraudRuleType.partnerCrossProgramBan,
        sourceProgramId: BANNING_PROGRAM_ID,
        metadata: {
          bannedReason: "tos_violation",
          bannedAt: BANNED_AT,
        },
      },
    ]);
  });

  it("flags an applicant with a confirmed admin ban", async () => {
    mocks.fraudAlertFindMany.mockResolvedValue([adminBanAlert]);

    await detectAndRecordFraudApplication({ context });

    expect(createdEvents()).toEqual([
      expect.objectContaining({
        type: FraudRuleType.partnerCrossProgramBan,
        sourceProgramId: NETWORK_PROGRAM_ID,
        metadata: {
          bannedReason: "fraud",
          bannedAt: REVIEWED_AT,
        },
      }),
    ]);
  });

  it("flags an admin ban stored on the applying program", async () => {
    mocks.fraudAlertFindMany.mockResolvedValue([
      { ...adminBanAlert, programId: PROGRAM_ID },
    ]);

    await detectAndRecordFraudApplication({ context });

    expect(createdEvents()).toEqual([
      expect.objectContaining({
        sourceProgramId: NETWORK_PROGRAM_ID,
      }),
    ]);
  });

  it("does not flag a program ban from the applying program", async () => {
    mocks.fraudAlertFindMany.mockResolvedValue([
      { ...programBanAlert, programId: PROGRAM_ID },
    ]);

    await detectAndRecordFraudApplication({ context });

    expect(createdEvents()).toEqual([]);
  });

  it("does not flag an applicant without a confirmed ban", async () => {
    await detectAndRecordFraudApplication({ context });

    expect(createdEvents()).toEqual([]);
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
    mocks.fraudAlertFindMany.mockResolvedValue([programBanAlert]);

    await detectAndRecordFraudApplication({ context });

    expect(mocks.fraudAlertFindMany).not.toHaveBeenCalled();
    expect(createdEvents()).toEqual([]);
  });
});

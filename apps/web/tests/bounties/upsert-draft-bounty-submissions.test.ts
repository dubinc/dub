import {
  planDraftBountySubmissionUpserts,
  shouldUpsertDraftSubmissionsOnReopen,
} from "@/lib/bounty/api/upsert-draft-bounty-submissions";
import { BountySubmissionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

const NOW = new Date("2025-06-01T12:00:00.000Z");
const PROGRAM_ID = "prog_test";
const BOUNTY_ID = "bnty_test";

const condition = {
  attribute: "totalSaleAmount" as const,
  operator: "gte" as const,
  value: 10_000,
};

function makePartner(
  overrides: Partial<{
    id: string;
    totalLeads: number;
    totalConversions: number;
    totalSaleAmount: number;
    totalCommissions: number;
  }> = {},
) {
  return {
    id: "pn_1",
    totalLeads: 0,
    totalConversions: 0,
    totalSaleAmount: 5_000,
    totalCommissions: 0,
    ...overrides,
  };
}

function makeSubmission(
  overrides: Partial<{
    id: string;
    partnerId: string;
    status: BountySubmissionStatus;
  }> = {},
) {
  return {
    id: "bnty_sub_1",
    partnerId: "pn_1",
    status: "draft" as BountySubmissionStatus,
    ...overrides,
  };
}

describe("shouldUpsertDraftSubmissionsOnReopen", () => {
  it("returns true when a lifetime performance bounty was expired and is now active", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: new Date("2025-05-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2025-12-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("returns true when endsAt is cleared after expiry", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: new Date("2025-05-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: null,
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("returns true when an expired bounty is rescheduled with a future startsAt", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: new Date("2025-05-01T00:00:00.000Z"),
        startsAt: new Date("2025-07-01T00:00:00.000Z"),
        endsAt: new Date("2025-12-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("returns false when the bounty previously had no endsAt", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: null,
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2025-12-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns false for new-scope performance bounties", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "new",
        previousEndsAt: new Date("2025-05-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2025-12-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns false when the bounty was not previously expired", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: new Date("2025-12-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-01-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns false when the bounty is still expired after the update", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: new Date("2025-04-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2025-05-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns false for archived bounties", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "performance",
        performanceScope: "lifetime",
        previousEndsAt: new Date("2025-05-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: null,
        archivedAt: new Date("2025-05-15T00:00:00.000Z"),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns false for submission bounties", () => {
    expect(
      shouldUpsertDraftSubmissionsOnReopen({
        type: "submission",
        performanceScope: null,
        previousEndsAt: new Date("2025-05-01T00:00:00.000Z"),
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2025-12-01T00:00:00.000Z"),
        archivedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });
});

describe("planDraftBountySubmissionUpserts", () => {
  it("creates a submission for partners without an existing row", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 5_000 })],
      existingSubmissions: [],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toUpdate).toHaveLength(0);
    expect(toCreate).toHaveLength(1);
    expect(toCreate[0]).toMatchObject({
      programId: PROGRAM_ID,
      partnerId: "pn_1",
      bountyId: BOUNTY_ID,
      performanceCount: 5_000,
    });
    expect(toCreate[0].status).toBeUndefined();
  });

  it("auto-submits newly created submissions that meet the condition", () => {
    const { toCreate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 15_000 })],
      existingSubmissions: [],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(1);
    expect(toCreate[0]).toMatchObject({
      performanceCount: 15_000,
      status: "submitted",
      completedAt: expect.any(Date),
    });
  });

  it("refreshes a draft submission performanceCount", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 8_000 })],
      existingSubmissions: [makeSubmission({ status: "draft" })],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(0);
    expect(toUpdate).toEqual([
      {
        id: "bnty_sub_1",
        performanceCount: 8_000,
        promoteToSubmitted: false,
        expectedStatus: "draft",
      },
    ]);
  });

  it("promotes a draft to submitted when the refreshed count meets the condition", () => {
    const { toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 12_000 })],
      existingSubmissions: [makeSubmission({ status: "draft" })],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toUpdate).toEqual([
      {
        id: "bnty_sub_1",
        performanceCount: 12_000,
        promoteToSubmitted: true,
        expectedStatus: "draft",
      },
    ]);
  });

  it("refreshes submitted performanceCount without changing status", () => {
    const { toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 20_000 })],
      existingSubmissions: [makeSubmission({ status: "submitted" })],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toUpdate).toEqual([
      {
        id: "bnty_sub_1",
        performanceCount: 20_000,
        promoteToSubmitted: false,
        expectedStatus: "submitted",
      },
    ]);
  });

  it("skips approved and rejected submissions", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [
        makePartner({ id: "pn_approved", totalSaleAmount: 20_000 }),
        makePartner({ id: "pn_rejected", totalSaleAmount: 20_000 }),
      ],
      existingSubmissions: [
        makeSubmission({
          id: "bnty_sub_approved",
          partnerId: "pn_approved",
          status: "approved",
        }),
        makeSubmission({
          id: "bnty_sub_rejected",
          partnerId: "pn_rejected",
          status: "rejected",
        }),
      ],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(0);
    expect(toUpdate).toHaveLength(0);
  });

  it("skips partners with zero performanceCount when there is no existing row", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 0 })],
      existingSubmissions: [],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(0);
    expect(toUpdate).toHaveLength(0);
  });

  it("refreshes a draft submission when performanceCount drops to zero", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 0 })],
      existingSubmissions: [makeSubmission({ status: "draft" })],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(0);
    expect(toUpdate).toEqual([
      {
        id: "bnty_sub_1",
        performanceCount: 0,
        promoteToSubmitted: false,
        expectedStatus: "draft",
      },
    ]);
  });

  it("refreshes a submitted submission when performanceCount drops to zero", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [makePartner({ totalSaleAmount: 0 })],
      existingSubmissions: [makeSubmission({ status: "submitted" })],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(0);
    expect(toUpdate).toEqual([
      {
        id: "bnty_sub_1",
        performanceCount: 0,
        promoteToSubmitted: false,
        expectedStatus: "submitted",
      },
    ]);
  });

  it("skips approved and rejected submissions when performanceCount is zero", () => {
    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners: [
        makePartner({ id: "pn_approved", totalSaleAmount: 0 }),
        makePartner({ id: "pn_rejected", totalSaleAmount: 0 }),
      ],
      existingSubmissions: [
        makeSubmission({
          id: "bnty_sub_approved",
          partnerId: "pn_approved",
          status: "approved",
        }),
        makeSubmission({
          id: "bnty_sub_rejected",
          partnerId: "pn_rejected",
          status: "rejected",
        }),
      ],
      condition,
      programId: PROGRAM_ID,
      bountyId: BOUNTY_ID,
    });

    expect(toCreate).toHaveLength(0);
    expect(toUpdate).toHaveLength(0);
  });
});

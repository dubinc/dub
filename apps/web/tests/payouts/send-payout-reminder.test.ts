import { MIN_PAYOUT_AMOUNT_FOR_REMINDERS } from "@/lib/constants/misc";
import { PAYOUT_SUPPORTED_COUNTRIES } from "@/lib/constants/payouts-supported-countries";
import { sendPayoutReminder } from "@/lib/payouts/send-payout-reminder";
import { ACME_PROGRAM_ID, DEMO_PROGRAM_ID } from "@dub/utils";
import { PayoutStatus, ProgramPayoutMode } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BATCH_SIZE = 500;
const MIGRATION_PROGRAM_ID = "prog_1M1EYH84K0ZGRA70CEGB4VC72";
const NOW = new Date("2026-09-24T09:00:00.000Z");

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  partnerFindMany: vi.fn(),
  programFindMany: vi.fn(),
  partnerUpdateMany: vi.fn(),
  queueBatchEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payout: {
      groupBy: mocks.groupBy,
    },
    partner: {
      findMany: mocks.partnerFindMany,
      updateMany: mocks.partnerUpdateMany,
    },
    program: {
      findMany: mocks.programFindMany,
    },
  },
}));

vi.mock("@/lib/email/queue-batch-email", () => ({
  queueBatchEmail: mocks.queueBatchEmail,
}));

function payoutGroup({
  partnerId,
  programId,
  amount,
}: {
  partnerId: string;
  programId: string;
  amount: number;
}) {
  return {
    partnerId,
    programId,
    _sum: { amount },
  };
}

function partner({ id, email }: { id: string; email: string | null }) {
  return {
    id,
    name: `Partner ${id}`,
    email,
  };
}

function program({ id }: { id: string }) {
  return {
    id,
    name: `Program ${id}`,
    logo: `https://example.com/${id}.png`,
  };
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const supportedCountry = PAYOUT_SUPPORTED_COUNTRIES[0].code;
const unsupportedCountry = "ZZ";

type ReminderCandidate = {
  status: PayoutStatus;
  programId: string;
  amount: number;
  payoutsEnabledAt: Date | null;
  country: string | null;
  connectPayoutsLastRemindedAt: Date | null;
};

const eligibleReminder: ReminderCandidate = {
  status: PayoutStatus.pending,
  programId: "prog_real",
  amount: MIN_PAYOUT_AMOUNT_FOR_REMINDERS,
  payoutsEnabledAt: null,
  country: null,
  connectPayoutsLastRemindedAt: null,
};

function matchesReminderFilters(
  where: {
    status?: { in?: PayoutStatus[] };
    programId?: { notIn?: string[] };
    amount?: { gte?: number };
    partner?: {
      payoutsEnabledAt?: Date | null;
      AND?: Array<{
        OR?: Array<{
          country?: string | null | { in?: string[] };
          connectPayoutsLastRemindedAt?: Date | null | { lte?: Date };
        }>;
      }>;
    };
  },
  candidate: ReminderCandidate,
) {
  if (!where.status?.in) {
    throw new Error("Missing status filter");
  }

  if (!where.status.in.includes(candidate.status)) {
    return false;
  }

  if (!where.programId?.notIn) {
    throw new Error("Missing program filter");
  }

  if (where.programId.notIn.includes(candidate.programId)) {
    return false;
  }

  if (typeof where.amount?.gte !== "number") {
    throw new Error("Missing amount filter");
  }

  if (candidate.amount < where.amount.gte) {
    return false;
  }

  const partner = where.partner;

  if (!partner || partner.payoutsEnabledAt !== null) {
    throw new Error("Missing payoutsEnabledAt filter");
  }

  if (candidate.payoutsEnabledAt !== null) {
    return false;
  }

  const countryOr = partner.AND?.find((clause) =>
    clause.OR?.some((item) => "country" in item),
  )?.OR;
  const remindedOr = partner.AND?.find((clause) =>
    clause.OR?.some((item) => "connectPayoutsLastRemindedAt" in item),
  )?.OR;

  if (!countryOr || !remindedOr) {
    throw new Error("Missing partner country or reminder filter");
  }

  const countryMatches = countryOr.some((clause) => {
    if (clause.country === null) {
      return candidate.country === null;
    }

    if (
      clause.country &&
      typeof clause.country === "object" &&
      clause.country.in
    ) {
      return (
        candidate.country !== null &&
        clause.country.in.includes(candidate.country)
      );
    }

    return false;
  });

  if (!countryMatches) {
    return false;
  }

  return remindedOr.some((clause) => {
    const remindedAt = clause.connectPayoutsLastRemindedAt;

    if (remindedAt === null) {
      return candidate.connectPayoutsLastRemindedAt === null;
    }

    if (
      !(remindedAt instanceof Date) &&
      remindedAt?.lte instanceof Date &&
      candidate.connectPayoutsLastRemindedAt !== null
    ) {
      return (
        candidate.connectPayoutsLastRemindedAt.getTime() <=
        remindedAt.lte.getTime()
      );
    }

    return false;
  });
}

function matchesProgramEnrollmentFilter(
  filter: {
    OR: Array<{
      program?: { payoutMode: ProgramPayoutMode };
      tenantId?: string | null;
    }>;
  },
  enrollment: {
    payoutMode: ProgramPayoutMode;
    tenantId: string | null;
  },
) {
  return filter.OR.some((clause) => {
    if (
      clause.program &&
      clause.program.payoutMode !== enrollment.payoutMode
    ) {
      return false;
    }

    if ("tenantId" in clause && clause.tenantId !== enrollment.tenantId) {
      return false;
    }

    return true;
  });
}

describe("sendPayoutReminder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    mocks.groupBy.mockReset().mockResolvedValue([]);
    mocks.partnerFindMany.mockReset().mockResolvedValue([]);
    mocks.programFindMany.mockReset().mockResolvedValue([]);
    mocks.partnerUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mocks.queueBatchEmail.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns without emailing when no payouts match", async () => {
    await expect(sendPayoutReminder()).resolves.toBeUndefined();

    expect(mocks.groupBy).toHaveBeenCalledOnce();

    expect(mocks.partnerFindMany).not.toHaveBeenCalled();
    expect(mocks.queueBatchEmail).not.toHaveBeenCalled();
    expect(mocks.partnerUpdateMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "pending status",
      patch: { status: PayoutStatus.pending },
      included: true,
    },
    {
      label: "processing status",
      patch: { status: PayoutStatus.processing },
      included: true,
    },
    {
      label: "processed status",
      patch: { status: PayoutStatus.processed },
      included: true,
    },
    {
      label: "failed status",
      patch: { status: PayoutStatus.failed },
      included: true,
    },
    {
      label: "sent status",
      patch: { status: PayoutStatus.sent },
      included: false,
    },
    {
      label: "completed status",
      patch: { status: PayoutStatus.completed },
      included: false,
    },
    {
      label: "canceled status",
      patch: { status: PayoutStatus.canceled },
      included: false,
    },
    {
      label: "Acme program",
      patch: { programId: ACME_PROGRAM_ID },
      included: false,
    },
    {
      label: "demo program",
      patch: { programId: DEMO_PROGRAM_ID },
      included: false,
    },
    {
      label: "migration program",
      patch: { programId: MIGRATION_PROGRAM_ID },
      included: false,
    },
    {
      label: "payouts already connected",
      patch: { payoutsEnabledAt: NOW },
      included: false,
    },
    {
      label: "missing country",
      patch: { country: null },
      included: true,
    },
    {
      label: "supported country",
      patch: { country: supportedCountry },
      included: true,
    },
    {
      label: "unsupported country",
      patch: { country: unsupportedCountry },
      included: false,
    },
    {
      label: "never reminded",
      patch: { connectPayoutsLastRemindedAt: null },
      included: true,
    },
    {
      label: "reminded exactly 3 days ago",
      patch: {
        connectPayoutsLastRemindedAt: new Date(NOW.getTime() - THREE_DAYS_MS),
      },
      included: true,
    },
    {
      label: "reminded more than 3 days ago",
      patch: {
        connectPayoutsLastRemindedAt: new Date(
          NOW.getTime() - THREE_DAYS_MS - 1,
        ),
      },
      included: true,
    },
    {
      label: "reminded within 3 days",
      patch: {
        connectPayoutsLastRemindedAt: new Date(
          NOW.getTime() - THREE_DAYS_MS + 1,
        ),
      },
      included: false,
    },
    {
      label: "amount at the minimum",
      patch: { amount: MIN_PAYOUT_AMOUNT_FOR_REMINDERS },
      included: true,
    },
    {
      label: "amount below the minimum",
      patch: { amount: MIN_PAYOUT_AMOUNT_FOR_REMINDERS - 1 },
      included: false,
    },
  ])("$label is included: $included", async ({ patch, included }) => {
    await sendPayoutReminder();

    const { where } = mocks.groupBy.mock.calls[0][0];

    expect(
      matchesReminderFilters(where, { ...eligibleReminder, ...patch }),
    ).toBe(included);
  });

  it.each([
    {
      payoutMode: ProgramPayoutMode.internal,
      tenantId: "tenant_1",
      included: true,
    },
    {
      payoutMode: ProgramPayoutMode.internal,
      tenantId: null,
      included: true,
    },
    {
      payoutMode: ProgramPayoutMode.external,
      tenantId: "tenant_1",
      included: false,
    },
    {
      payoutMode: ProgramPayoutMode.external,
      tenantId: null,
      included: false,
    },
    {
      payoutMode: ProgramPayoutMode.hybrid,
      tenantId: "tenant_1",
      included: false,
    },
    {
      payoutMode: ProgramPayoutMode.hybrid,
      tenantId: null,
      included: true,
    },
  ])(
    "payout mode $payoutMode with tenantId $tenantId is included: $included",
    async ({ payoutMode, tenantId, included }) => {
      await sendPayoutReminder();

      const { where } = mocks.groupBy.mock.calls[0][0];

      expect(
        matchesProgramEnrollmentFilter(where.programEnrollment, {
          payoutMode,
          tenantId,
        }),
      ).toBe(included);
    },
  );

  it("sends one reminder per partner and records when they were reminded", async () => {
    mocks.groupBy
      .mockResolvedValueOnce([{ partnerId: "pn_1" }, { partnerId: "pn_2" }])
      .mockResolvedValueOnce([
        payoutGroup({
          partnerId: "pn_1",
          programId: "prog_a",
          amount: 2500,
        }),
        payoutGroup({
          partnerId: "pn_1",
          programId: "prog_b",
          amount: 1500,
        }),
        payoutGroup({
          partnerId: "pn_2",
          programId: "prog_a",
          amount: 1000,
        }),
      ]);
    mocks.partnerFindMany.mockResolvedValue([
      partner({ id: "pn_1", email: "one@example.com" }),
      partner({ id: "pn_2", email: "two@example.com" }),
    ]);
    mocks.programFindMany.mockResolvedValue([
      program({ id: "prog_a" }),
      program({ id: "prog_b" }),
    ]);

    await expect(sendPayoutReminder()).resolves.toBeUndefined();

    expect(mocks.groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        by: ["partnerId"],
        orderBy: { partnerId: "asc" },
        take: BATCH_SIZE,
      }),
    );
    expect(mocks.groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        by: ["partnerId", "programId"],
        where: expect.objectContaining({
          partnerId: { in: ["pn_1", "pn_2"] },
        }),
      }),
    );
    expect(mocks.partnerFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["pn_1", "pn_1", "pn_2"],
        },
        OR: [
          {
            users: {
              none: {},
            },
          },
          {
            users: {
              some: {
                notificationPreferences: {
                  connectPayoutReminder: true,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    expect(mocks.programFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["prog_a", "prog_b", "prog_a"],
        },
      },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    });
    expect(mocks.queueBatchEmail).toHaveBeenCalledWith(
      [
        {
          variant: "notifications",
          to: "one@example.com",
          subject: "Connect your payout details on Dub Partners",
          templateName: "ConnectPayoutReminder",
          templateProps: {
            email: "one@example.com",
            programs: [
              {
                id: "prog_a",
                name: "Program prog_a",
                logo: "https://example.com/prog_a.png",
                amount: 2500,
              },
              {
                id: "prog_b",
                name: "Program prog_b",
                logo: "https://example.com/prog_b.png",
                amount: 1500,
              },
            ],
          },
        },
        {
          variant: "notifications",
          to: "two@example.com",
          subject: "Connect your payout details on Dub Partners",
          templateName: "ConnectPayoutReminder",
          templateProps: {
            email: "two@example.com",
            programs: [
              {
                id: "prog_a",
                name: "Program prog_a",
                logo: "https://example.com/prog_a.png",
                amount: 1000,
              },
            ],
          },
        },
      ],
      {
        idempotencyKey: "payout-reminders-2026-09-24-1",
      },
    );
    expect(mocks.partnerUpdateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["pn_1", "pn_2"],
        },
      },
      data: {
        connectPayoutsLastRemindedAt: NOW,
      },
    });
  });

  it("skips partners with no email and partners excluded by notification preferences", async () => {
    mocks.groupBy
      .mockResolvedValueOnce([
        { partnerId: "pn_no_email" },
        { partnerId: "pn_opted_out" },
        { partnerId: "pn_ok" },
      ])
      .mockResolvedValueOnce([
        payoutGroup({
          partnerId: "pn_no_email",
          programId: "prog_a",
          amount: 2000,
        }),
        payoutGroup({
          partnerId: "pn_opted_out",
          programId: "prog_a",
          amount: 2000,
        }),
        payoutGroup({
          partnerId: "pn_ok",
          programId: "prog_a",
          amount: 2000,
        }),
      ]);
    mocks.partnerFindMany.mockResolvedValue([
      partner({ id: "pn_no_email", email: null }),
      partner({ id: "pn_ok", email: "ok@example.com" }),
    ]);
    mocks.programFindMany.mockResolvedValue([program({ id: "prog_a" })]);

    await expect(sendPayoutReminder()).resolves.toBeUndefined();

    expect(mocks.queueBatchEmail).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          to: "ok@example.com",
        }),
      ],
      {
        idempotencyKey: "payout-reminders-2026-09-24-1",
      },
    );
    expect(mocks.partnerUpdateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["pn_ok"],
        },
      },
      data: {
        connectPayoutsLastRemindedAt: NOW,
      },
    });
  });

  it("returns the last partner id when the batch is full", async () => {
    const partnerIds = Array.from({ length: BATCH_SIZE }, (_, index) => ({
      partnerId: `pn_${index}`,
    }));

    mocks.groupBy.mockResolvedValueOnce(partnerIds).mockResolvedValueOnce([
      payoutGroup({
        partnerId: "pn_0",
        programId: "prog_a",
        amount: 1000,
      }),
    ]);
    mocks.partnerFindMany.mockResolvedValue([
      partner({ id: "pn_0", email: "zero@example.com" }),
    ]);
    mocks.programFindMany.mockResolvedValue([program({ id: "prog_a" })]);

    await expect(sendPayoutReminder()).resolves.toBe("pn_499");
  });

  it("continues after the partner id from the previous batch", async () => {
    mocks.groupBy
      .mockResolvedValueOnce([{ partnerId: "pn_11" }])
      .mockResolvedValueOnce([
        payoutGroup({
          partnerId: "pn_11",
          programId: "prog_a",
          amount: 1000,
        }),
      ]);
    mocks.partnerFindMany.mockResolvedValue([
      partner({ id: "pn_11", email: "eleven@example.com" }),
    ]);
    mocks.programFindMany.mockResolvedValue([program({ id: "prog_a" })]);

    await sendPayoutReminder({ afterPartnerId: "pn_10", batchNumber: 2 });

    expect(mocks.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["partnerId"],
        where: expect.objectContaining({
          partnerId: {
            gt: "pn_10",
          },
        }),
      }),
    );
    expect(mocks.queueBatchEmail).toHaveBeenCalledWith(expect.any(Array), {
      idempotencyKey: "payout-reminders-2026-09-24-2",
    });
  });
});

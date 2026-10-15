import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { ProgramApplicationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: mocks.findUniqueOrThrow,
    },
    programApplication: {
      findMany: mocks.findMany,
      updateMany: vi.fn(),
    },
    programEnrollment: {
      createMany: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));

const EMAIL = "partner@example.com";

// Rejected with an instant reapplication timeframe, so the enrollment
// was deleted and the application has no enrollment.
const rejectedApplication = {
  id: "pga_rejected",
  programId: "prog_acme",
  email: EMAIL,
  status: ProgramApplicationStatus.rejected,
  createdAt: new Date("2026-10-09"),
};

describe("completeProgramApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.findUniqueOrThrow.mockResolvedValue({
      partners: [
        {
          partnerId: "pn_test",
          partner: { id: "pn_test", platforms: [], programs: [] },
        },
      ],
    });

    mocks.findMany.mockImplementation(({ where }) =>
      [rejectedApplication].filter(
        (application) => !where.status || application.status === where.status,
      ),
    );
  });

  it("only queries pending applications without an enrollment", async () => {
    await completeProgramApplications(EMAIL);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: EMAIL,
          status: ProgramApplicationStatus.pending,
          enrollment: null,
        }),
      }),
    );
  });

  it("does not recreate an enrollment for a rejected application", async () => {
    await completeProgramApplications(EMAIL);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

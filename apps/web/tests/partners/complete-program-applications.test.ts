import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { ProgramApplicationStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  findMany: vi.fn(),
  createMany: vi.fn(),
  transaction: vi.fn(),
  queuePartnerSearchSync: vi.fn(),
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
      createMany: mocks.createMany,
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: mocks.transaction,
  },
}));

// Side effects of a completed application are not under test here
vi.mock("@/lib/api/fraud/detect-record-fraud-application", () => ({
  detectAndRecordFraudApplication: vi.fn(),
}));

vi.mock("@/lib/api/partners/notify-program-application", () => ({
  notifyProgramApplication: vi.fn(),
}));

vi.mock("@/lib/api/partners/queue-partner-search-sync", () => ({
  queuePartnerSearchSync: mocks.queuePartnerSearchSync,
}));

vi.mock("@/lib/application-events/update-application-event", () => ({
  markApplicationEventSubmitted: vi.fn(),
}));

vi.mock("@/lib/jobs/handlers/auto-reject-program-application-job", () => ({
  autoRejectProgramApplicationJob: { dispatch: vi.fn() },
}));

vi.mock("@/lib/webhook/publish", () => ({
  sendWorkspaceWebhook: vi.fn(),
}));

vi.mock("@/lib/partners/backfill-partner-platforms", () => ({
  backfillPartnerPlatforms: vi.fn().mockResolvedValue({ platforms: [] }),
  mergeApplicationSocialPlatforms: vi
    .fn()
    .mockReturnValue({ platforms: [], socialFields: {} }),
}));

vi.mock("@/lib/partners/dispatch-partner-application-review", () => ({
  dispatchPartnerApplicationReview: vi.fn(),
}));

const EMAIL = "partner@example.com";
const PARTNER_ID = "pn_test";

// Rejected with an instant reapplication timeframe, so the enrollment
// was deleted and the application has no enrollment.
const rejectedApplication = {
  id: "pga_rejected",
  programId: "prog_acme",
  email: EMAIL,
  status: ProgramApplicationStatus.rejected,
  createdAt: new Date("2026-10-09"),
};

// Submitted while logged out, so it waits for the partner to sign in
const pendingApplication = {
  id: "pga_pending",
  programId: "prog_other",
  email: EMAIL,
  status: ProgramApplicationStatus.pending,
  formData: null,
  createdAt: new Date("2026-10-10"),
  program: {
    id: "prog_other",
    applicationRequirements: null,
    applicationScreeningCriteria: null,
  },
  partnerGroup: null,
};

function mockApplications(applications: { status: string }[]) {
  mocks.findMany.mockImplementation(({ where }) =>
    applications.filter(
      (application) => !where.status || application.status === where.status,
    ),
  );
}

describe("completeProgramApplications", () => {
  // The function catches and logs every error, so a failure is only visible here
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.findUniqueOrThrow.mockResolvedValue({
      partners: [
        {
          partnerId: PARTNER_ID,
          partner: { id: PARTNER_ID, platforms: [], programs: [] },
        },
      ],
    });

    mocks.transaction.mockResolvedValue([]);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("only queries pending applications without an enrollment", async () => {
    mockApplications([rejectedApplication]);

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
    mockApplications([rejectedApplication]);

    await completeProgramApplications(EMAIL);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates an enrollment only for the pending application", async () => {
    mockApplications([pendingApplication, rejectedApplication]);

    await completeProgramApplications(EMAIL);

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          applicationId: pendingApplication.id,
          programId: pendingApplication.programId,
          partnerId: PARTNER_ID,
        }),
      ],
      skipDuplicates: true,
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.queuePartnerSearchSync).toHaveBeenCalledWith({
      enrollmentIds: [expect.any(String)],
    });
    expect(consoleError).not.toHaveBeenCalled();
  });
});

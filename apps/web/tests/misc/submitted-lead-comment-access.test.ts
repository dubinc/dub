import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as partnerComments } from "../../app/(ee)/api/partner-profile/programs/[programId]/submitted-leads/[leadId]/comments/route";
import { GET as workspaceComments } from "../../app/(ee)/api/programs/[programId]/submitted-leads/[leadId]/comments/route";

const mocks = vi.hoisted(() => ({
  findLead: vi.fn(),
  findComments: vi.fn(),
  enrollment: vi.fn(),
  workspaceOptions: undefined as unknown,
}));

// Test the route's access rules. The middleware supplies authentication.
vi.mock("@/lib/auth", () => ({
  withWorkspace: (handler: unknown, options: unknown) => {
    mocks.workspaceOptions = options;
    return handler;
  },
}));
vi.mock("@/lib/auth/partner", () => ({
  withPartnerProfile: (handler: unknown) => handler,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submittedLead: { findUnique: mocks.findLead },
    submittedLeadComment: { findMany: mocks.findComments },
  },
}));
vi.mock("@/lib/api/programs/get-program-enrollment-or-throw", () => ({
  getProgramEnrollmentOrThrow: mocks.enrollment,
}));
vi.mock("@/lib/api/errors", () => ({
  DubApiError: class extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
}));

const context = {
  partner: { id: "pn_1" },
  workspace: { defaultProgramId: "prog_1" },
  params: { programId: "program-slug", leadId: "lead_1" },
};
// The middleware mocks expose the wrapped callback for these tests.
const readPartnerComments = partnerComments as unknown as (
  ctx: typeof context,
) => Promise<Response>;
const readWorkspaceComments = workspaceComments as unknown as (
  ctx: typeof context,
) => Promise<Response>;

const comment = (id: string, partnerVisible: boolean) => ({
  id,
  leadId: "lead_1",
  userId: "user_1",
  partnerId: null,
  text: id,
  partnerVisible,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: "user_1", name: "Author", image: null },
});

describe("submitted lead comment access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.enrollment.mockResolvedValue({ programId: "prog_1" });
    mocks.findLead.mockImplementation(
      async ({
        where,
      }: {
        where: { partnerId?: string; programId?: string };
      }) => {
        if (where.partnerId && where.partnerId !== "pn_1") return null;
        if (where.programId && where.programId !== "prog_1") return null;
        return { id: "lead_1", programId: "prog_1" };
      },
    );
    mocks.findComments.mockImplementation(
      async ({ where }: { where: { partnerVisible?: boolean } }) =>
        [comment("private", false), comment("visible", true)].filter(
          (comment) =>
            where.partnerVisible === undefined ||
            comment.partnerVisible === where.partnerVisible,
        ),
    );
  });

  it("excludes private workspace comments from the partner response", async () => {
    const response = await readPartnerComments(context);

    expect((await response.json()).map(({ id }: { id: string }) => id)).toEqual(
      ["visible"],
    );
    expect(mocks.findLead).toHaveBeenCalledWith({
      where: { id: "lead_1", programId: "prog_1", partnerId: "pn_1" },
      select: { id: true },
    });
  });

  it("rejects a lead owned by another partner before loading comments", async () => {
    await expect(
      readPartnerComments({ ...context, partner: { id: "pn_other" } }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(mocks.findComments).not.toHaveBeenCalled();
  });

  it("rejects a lead in another program before loading comments", async () => {
    mocks.enrollment.mockResolvedValue({ programId: "prog_other" });

    await expect(readPartnerComments(context)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(mocks.findComments).not.toHaveBeenCalled();
  });

  it("rejects a partner without an enrollment before loading the lead", async () => {
    mocks.enrollment.mockRejectedValue(new Error("Not enrolled"));

    await expect(readPartnerComments(context)).rejects.toThrow("Not enrolled");
    expect(mocks.findLead).not.toHaveBeenCalled();
    expect(mocks.findComments).not.toHaveBeenCalled();
  });

  it("requires the messages.read permission on the workspace route", () => {
    expect(mocks.workspaceOptions).toMatchObject({
      requiredPermissions: ["messages.read"],
    });
  });

  it("returns private and visible comments to the owning workspace", async () => {
    const response = await readWorkspaceComments(context);

    expect((await response.json()).map(({ id }: { id: string }) => id)).toEqual(
      ["private", "visible"],
    );
  });

  it("rejects another workspace even when the URL names the lead's program", async () => {
    await expect(
      readWorkspaceComments({
        ...context,
        workspace: { defaultProgramId: "prog_other" },
        params: { ...context.params, programId: "prog_1" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(mocks.findComments).not.toHaveBeenCalled();
  });
});

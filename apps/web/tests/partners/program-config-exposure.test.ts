import {
  ProgramEnrollmentSchema,
  ProgramSchema,
  ProgramSchemaWithInviteEmailData,
} from "@/lib/zod/schemas/programs";
import { describe, expect, it } from "vitest";

const programRow = {
  id: "prog_1",
  name: "Acme",
  slug: "acme",
  logo: null,
  domain: null,
  url: null,
  description: null,
  primaryRewardEvent: "sale" as const,
  minPayoutAmount: 0,
  payoutMode: "internal" as const,
  defaultFolderId: "fold_1",
  defaultGroupId: "grp_1",
  applicationScreeningCriteria: "reject anyone doing SEO or backlinking",
  aiAutoApproveEnabledAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("program config exposure", () => {
  it("is stripped from the partner-facing enrollment payload", () => {
    const parsed = ProgramEnrollmentSchema.parse({
      programId: "prog_1",
      groupId: null,
      partnerId: "pn_1",
      tenantId: null,
      program: programRow,
      createdAt: new Date(),
      status: "pending" as const,
      links: null,
      totalCommissions: 0,
      customerDataSharingEnabledAt: null,
      groupMoveDisabledAt: null,
      riskMonitoringDisabledAt: null,
    });

    expect(parsed.program).not.toHaveProperty("applicationScreeningCriteria");
    expect(parsed.program).not.toHaveProperty("aiAutoApproveEnabledAt");
  });

  it("is stripped from the bare ProgramSchema", () => {
    const parsed = ProgramSchema.parse(programRow);

    expect(parsed).not.toHaveProperty("applicationScreeningCriteria");
    expect(parsed).not.toHaveProperty("aiAutoApproveEnabledAt");
  });

  it("is kept on the workspace-scoped program payload", () => {
    const parsed = ProgramSchemaWithInviteEmailData.parse({
      ...programRow,
      inviteEmailData: null,
    });

    expect(parsed.applicationScreeningCriteria).toBe(
      "reject anyone doing SEO or backlinking",
    );
    expect(parsed.aiAutoApproveEnabledAt).toBeInstanceOf(Date);
  });
});

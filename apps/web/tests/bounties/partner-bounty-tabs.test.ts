import {
  countPartnerBountiesByTab,
  getPartnerBountyTab,
} from "@/lib/bounty/partner-bounty-tabs";
import { PartnerBountyProps } from "@/lib/types";
import { describe, expect, it } from "vitest";

const day = 24 * 60 * 60 * 1000;

const bounty = (
  overrides: Partial<PartnerBountyProps> & {
    submissionStatuses?: string[];
    performanceCount?: number;
  } = {},
) => {
  const { submissionStatuses = [], performanceCount, ...rest } = overrides;

  return {
    type: "submission",
    endsAt: null,
    maxSubmissions: 1,
    performanceCondition: null,
    submissions: submissionStatuses.map((status) => ({
      status,
      performanceCount: performanceCount ?? null,
    })),
    ...rest,
  } as unknown as PartnerBountyProps;
};

describe("getPartnerBountyTab", () => {
  it("puts a bounty without enough submissions in Active", () => {
    expect(getPartnerBountyTab(bounty({ maxSubmissions: 2 }))).toBe("active");
  });

  it("does not count draft submissions", () => {
    expect(getPartnerBountyTab(bounty({ submissionStatuses: ["draft"] }))).toBe(
      "active",
    );
  });

  it("puts a bounty with the maximum number of submissions in Completed", () => {
    expect(
      getPartnerBountyTab(bounty({ submissionStatuses: ["submitted"] })),
    ).toBe("completed");
  });

  it("puts a performance bounty that reached its target in Completed", () => {
    const performanceBounty = (performanceCount: number) =>
      bounty({
        type: "performance",
        performanceCondition: {
          attribute: "totalSaleAmount",
          operator: "gte",
          value: 100_000,
        },
        submissionStatuses: ["draft"],
        performanceCount,
      });

    expect(getPartnerBountyTab(performanceBounty(50_000))).toBe("active");
    expect(getPartnerBountyTab(performanceBounty(100_000))).toBe("completed");
  });

  it("keeps a performance bounty without a condition out of Completed", () => {
    expect(
      getPartnerBountyTab(
        bounty({
          type: "performance",
          submissionStatuses: ["draft"],
          performanceCount: 0,
        }),
      ),
    ).toBe("active");
  });

  it("puts a performance bounty with a zero target in Completed", () => {
    expect(
      getPartnerBountyTab(
        bounty({
          type: "performance",
          performanceCondition: {
            attribute: "totalLeads",
            operator: "gte",
            value: 0,
          },
          submissionStatuses: ["draft"],
          performanceCount: 0,
        }),
      ),
    ).toBe("completed");
  });

  it("keeps a completed bounty in Completed after it ends", () => {
    expect(
      getPartnerBountyTab(
        bounty({
          endsAt: new Date(Date.now() - day),
          submissionStatuses: ["approved"],
        }),
      ),
    ).toBe("completed");
  });

  it("puts an ended bounty that the partner did not complete in Expired", () => {
    expect(
      getPartnerBountyTab(bounty({ endsAt: new Date(Date.now() - day) })),
    ).toBe("expired");
  });
});

describe("countPartnerBountiesByTab", () => {
  it("counts every tab, with 0 for an empty or missing list", () => {
    const empty = { active: 0, completed: 0, expired: 0 };

    expect(countPartnerBountiesByTab(undefined)).toEqual(empty);
    expect(countPartnerBountiesByTab([])).toEqual(empty);
  });

  it("counts each bounty in its tab", () => {
    expect(
      countPartnerBountiesByTab([
        bounty(),
        bounty({ maxSubmissions: 2, submissionStatuses: ["submitted"] }),
        bounty({ submissionStatuses: ["approved"] }),
        bounty({ endsAt: new Date(Date.now() - day) }),
      ]),
    ).toEqual({ active: 2, completed: 1, expired: 1 });
  });
});

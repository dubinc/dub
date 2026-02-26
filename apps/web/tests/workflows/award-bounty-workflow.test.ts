import { EnrolledPartnerProps } from "@/lib/types";
import { Bounty } from "@dub/prisma/client";
import { E2E_PARTNER_GROUP, E2E_WORKSPACE_ID } from "tests/utils/resource";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { deleteBountyAndSubmissions } from "./utils/delete-bounty-and-submissions";
import { trackE2ELead } from "./utils/track-e2e-lead";
import { verifyBountySubmission } from "./utils/verify-bounty-submission";

const ws = (q: Record<string, string> = {}) => ({
  ...q,
  workspaceId: E2E_WORKSPACE_ID,
});

describe.sequential("Workflow - AwardBounty", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test(
    "Workflow executes when partner reaches goal",
    { timeout: 90000 },
    async () => {
      const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        query: ws(),
        body: {
          name: "E2E Performance Bounty - Goal Reached",
          description: "Get 2 leads to earn $10",
          type: "performance",
          startsAt: new Date().toISOString(),
          endsAt: null,
          rewardAmount: 1000,
          performanceScope: "new",
          groupIds: [E2E_PARTNER_GROUP.id],
          performanceCondition: {
            attribute: "totalLeads",
            operator: "gte",
            value: 1,
          },
        },
      });

      expect(bountyStatus).toEqual(200);

      onTestFinished(async () => {
        await deleteBountyAndSubmissions({
          http,
          bountyId: bounty.id,
          query: ws(),
        });
      });

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/partners",
          query: ws(),
          body: {
            name: "E2E Test Partner - Goal",
            email: randomEmail(),
            groupId: E2E_PARTNER_GROUP.id,
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).not.toBeNull();
      expect(partner.links!.length).toBeGreaterThan(0);

      const partnerLink = partner.links![0];

      await trackE2ELead(http, partnerLink);

      const submission = await verifyBountySubmission({
        http,
        bountyId: bounty.id,
        partnerId: partner.id,
        expectedStatus: "submitted",
        minPerformanceCount: 1,
        query: ws(),
      });

      expect(submission.status).toBe("submitted");
      expect(submission.performanceCount).toBeGreaterThanOrEqual(1);
      expect(submission.completedAt).not.toBeNull();
    },
  );

  test("Workflow doesn't execute when goal not reached", async () => {
    const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      query: ws(),
      body: {
        name: "E2E Performance Bounty - Not Reached",
        description: "Get 2 leads to earn $10",
        type: "performance",
        startsAt: new Date().toISOString(),
        endsAt: null,
        rewardAmount: 1000,
        performanceScope: "new",
        groupIds: [E2E_PARTNER_GROUP.id],
        performanceCondition: {
          attribute: "totalLeads",
          operator: "gte",
          value: 2,
        },
      },
    });

    expect(bountyStatus).toEqual(200);

    onTestFinished(async () => {
      await deleteBountyAndSubmissions({
        http,
        bountyId: bounty.id,
        query: ws(),
      });
    });

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - Not Reached",
          email: randomEmail(),
          groupId: E2E_PARTNER_GROUP.id,
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const partnerLink = partner.links![0];

    await trackE2ELead(http, partnerLink);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: submissions } = await http.get<any[]>({
      path: `/bounties/${bounty.id}/submissions`,
      query: ws({ partnerId: partner.id }),
    });

    expect(submissions.length).toBeGreaterThan(0);

    const submission = submissions[0];
    expect(submission.status).toBe("draft");
    expect(submission.performanceCount).toBe(1);
    expect(submission.completedAt).toBeNull();
  });

  test("Disabled workflow doesn't execute", async () => {
    const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      query: ws(),
      body: {
        name: "E2E Performance Bounty - Disabled",
        description: "Get 2 leads to earn $10",
        type: "performance",
        startsAt: new Date().toISOString(),
        endsAt: null,
        rewardAmount: 1000,
        performanceScope: "new",
        groupIds: [E2E_PARTNER_GROUP.id],
        performanceCondition: {
          attribute: "totalLeads",
          operator: "gte",
          value: 2,
        },
      },
    });

    expect(bountyStatus).toEqual(200);

    onTestFinished(async () => {
      await deleteBountyAndSubmissions({
        http,
        bountyId: bounty.id,
        query: ws(),
      });
    });

    // Find workflow via E2E endpoint and disable it
    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: ws({ bountyId: bounty.id }),
    });

    expect(workflow).not.toBeNull();

    await http.patch({
      path: `/e2e/workflows/${workflow.id}`,
      query: ws(),
      body: { disabledAt: new Date().toISOString() },
    });

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/partners",
        query: ws(),
        body: {
          name: "E2E Test Partner - Disabled",
          email: randomEmail(),
          groupId: E2E_PARTNER_GROUP.id,
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const partnerLink = partner.links![0];

    await trackE2ELead(http, partnerLink);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: submissions } = await http.get<any[]>({
      path: `/bounties/${bounty.id}/submissions`,
      query: ws({ partnerId: partner.id }),
    });

    expect(submissions).toHaveLength(0);
  });

  test(
    "No duplicate execution on multiple triggers",
    { timeout: 90000 },
    async () => {
      const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        query: ws(),
        body: {
          name: "E2E Performance Bounty - No Duplicates",
          description: "Get 2 leads to earn $10",
          type: "performance",
          startsAt: new Date().toISOString(),
          endsAt: null,
          rewardAmount: 1000,
          performanceScope: "new",
          groupIds: [E2E_PARTNER_GROUP.id],
          performanceCondition: {
            attribute: "totalLeads",
            operator: "gte",
            value: 1,
          },
        },
      });

      expect(bountyStatus).toEqual(200);

      onTestFinished(async () => {
        await deleteBountyAndSubmissions({
          http,
          bountyId: bounty.id,
          query: ws(),
        });
      });

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/partners",
          query: ws(),
          body: {
            name: "E2E Test Partner - No Dup",
            email: randomEmail(),
            groupId: E2E_PARTNER_GROUP.id,
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).not.toBeNull();

      const partnerLink = partner.links![0];

      await trackE2ELead(http, partnerLink);

      await verifyBountySubmission({
        http,
        bountyId: bounty.id,
        partnerId: partner.id,
        expectedStatus: "submitted",
        minPerformanceCount: 1,
        query: ws(),
      });

      const { data: submissions } = await http.get<any[]>({
        path: `/bounties/${bounty.id}/submissions`,
        query: ws({ partnerId: partner.id }),
      });

      expect(submissions).toHaveLength(1);
      expect(submissions[0].status).toBe("submitted");
    },
  );
});

import { EnrolledPartnerProps } from "@/lib/types";
import { Bounty } from "@dub/prisma/client";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { trackLeads } from "./utils/track-leads";
import { verifyBountySubmission } from "./utils/verify-bounty-submission";

describe.sequential("Workflow - AwardBounty", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test(
    "Workflow executes when partner reaches goal",
    { timeout: 90000 },
    async () => {
      const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        body: {
          name: "E2E Performance Bounty - Goal Reached",
          description: "Get 2 leads to earn $10",
          type: "performance",
          startsAt: new Date().toISOString(),
          endsAt: null,
          rewardAmount: 1000,
          performanceScope: "new",
          groupIds: [],
          performanceCondition: {
            attribute: "totalLeads",
            operator: "gte",
            value: 2,
          },
        },
      });

      expect(bountyStatus).toEqual(200);

      onTestFinished(async () => {
        await h.deleteBounty(bounty.id);
      });

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/partners",
          body: {
            name: "E2E Test Partner - Goal",
            email: randomEmail(),
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).not.toBeNull();
      expect(partner.links!.length).toBeGreaterThan(0);

      const partnerLink = partner.links![0];

      await trackLeads(http, partnerLink, 3);

      const submission = await verifyBountySubmission({
        http,
        bountyId: bounty.id,
        partnerId: partner.id,
        expectedStatus: "submitted",
        minPerformanceCount: 2,
      });

      expect(submission.status).toBe("submitted");
      expect(submission.performanceCount).toBeGreaterThanOrEqual(2);
      expect(submission.completedAt).not.toBeNull();
    },
  );

  test("Workflow doesn't execute when goal not reached", async () => {
    const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        name: "E2E Performance Bounty - Not Reached",
        description: "Get 2 leads to earn $10",
        type: "performance",
        startsAt: new Date().toISOString(),
        endsAt: null,
        rewardAmount: 1000,
        performanceScope: "new",
        groupIds: [],
        performanceCondition: {
          attribute: "totalLeads",
          operator: "gte",
          value: 2,
        },
      },
    });

    expect(bountyStatus).toEqual(200);

    onTestFinished(async () => {
      await h.deleteBounty(bounty.id);
    });

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/partners",
        body: {
          name: "E2E Test Partner - Not Reached",
          email: randomEmail(),
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const partnerLink = partner.links![0];

    await trackLeads(http, partnerLink, 1);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: submissions } = await http.get<any[]>({
      path: `/bounties/${bounty.id}/submissions`,
      query: { partnerId: partner.id },
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
      body: {
        name: "E2E Performance Bounty - Disabled",
        description: "Get 2 leads to earn $10",
        type: "performance",
        startsAt: new Date().toISOString(),
        endsAt: null,
        rewardAmount: 1000,
        performanceScope: "new",
        groupIds: [],
        performanceCondition: {
          attribute: "totalLeads",
          operator: "gte",
          value: 2,
        },
      },
    });

    expect(bountyStatus).toEqual(200);

    onTestFinished(async () => {
      await h.deleteBounty(bounty.id);
    });

    // Find workflow via E2E endpoint and disable it
    const { data: workflow } = await http.get<any>({
      path: "/e2e/workflows",
      query: { bountyId: bounty.id },
    });

    expect(workflow).not.toBeNull();

    await http.patch({
      path: `/e2e/workflows/${workflow.id}`,
      body: { disabledAt: new Date().toISOString() },
    });

    const { status: partnerStatus, data: partner } =
      await http.post<EnrolledPartnerProps>({
        path: "/partners",
        body: {
          name: "E2E Test Partner - Disabled",
          email: randomEmail(),
        },
      });

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();

    const partnerLink = partner.links![0];

    await trackLeads(http, partnerLink, 3);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const { data: submissions } = await http.get<any[]>({
      path: `/bounties/${bounty.id}/submissions`,
      query: { partnerId: partner.id },
    });

    expect(submissions).toHaveLength(0);
  });

  test(
    "No duplicate execution on multiple triggers",
    { timeout: 90000 },
    async () => {
      const { status: bountyStatus, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        body: {
          name: "E2E Performance Bounty - No Duplicates",
          description: "Get 2 leads to earn $10",
          type: "performance",
          startsAt: new Date().toISOString(),
          endsAt: null,
          rewardAmount: 1000,
          performanceScope: "new",
          groupIds: [],
          performanceCondition: {
            attribute: "totalLeads",
            operator: "gte",
            value: 2,
          },
        },
      });

      expect(bountyStatus).toEqual(200);

      onTestFinished(async () => {
        await h.deleteBounty(bounty.id);
      });

      const { status: partnerStatus, data: partner } =
        await http.post<EnrolledPartnerProps>({
          path: "/partners",
          body: {
            name: "E2E Test Partner - No Dup",
            email: randomEmail(),
          },
        });

      expect(partnerStatus).toEqual(201);
      expect(partner.links).not.toBeNull();

      const partnerLink = partner.links![0];

      await trackLeads(http, partnerLink, 5);

      await verifyBountySubmission({
        http,
        bountyId: bounty.id,
        partnerId: partner.id,
        expectedStatus: "submitted",
        minPerformanceCount: 2,
      });

      const { data: submissions } = await http.get<any[]>({
        path: `/bounties/${bounty.id}/submissions`,
        query: { partnerId: partner.id },
      });

      expect(submissions).toHaveLength(1);
      expect(submissions[0].status).toBe("submitted");
    },
  );
});

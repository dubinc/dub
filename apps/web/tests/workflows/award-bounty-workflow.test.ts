import { EnrolledPartnerProps } from "@/lib/types";
import { Bounty } from "@dub/prisma/client";
import { prisma } from "@dub/prisma";
import { describe, expect, test, onTestFinished } from "vitest";
import { randomEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_TRACK_CLICK_HEADERS } from "../utils/resource";
import { verifyBountySubmission } from "./utils/verify-bounty-submission";

async function trackLeads(
  http: any,
  partnerLink: { domain: string; key: string },
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const { status: clickStatus, data: clickData } = await http.post({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: partnerLink.domain,
        key: partnerLink.key,
      },
    });

    expect(clickStatus).toEqual(200);
    expect(clickData.clickId).toBeDefined();

    const { status: leadStatus } = await http.post({
      path: "/track/lead",
      body: {
        clickId: clickData.clickId,
        eventName: `Signup-${i}-${Date.now()}`,
        customerExternalId: `e2e-customer-${i}-${Date.now()}`,
        customerEmail: `customer${i}@example.com`,
      },
    });

    expect(leadStatus).toEqual(200);

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

describe.sequential("Workflow - AwardBounty", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("Workflow executes when partner reaches goal", { timeout: 90000 }, async () => {
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

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
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
      bountyId: bounty.id,
      partnerId: partner.id,
      expectedStatus: "submitted",
      minPerformanceCount: 2,
    });

    expect(submission.status).toBe("submitted");
    expect(submission.performanceCount).toBeGreaterThanOrEqual(2);
    expect(submission.completedAt).not.toBeNull();
  });

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

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
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

    const submission = await prisma.bountySubmission.findFirst({
      where: {
        bountyId: bounty.id,
        partnerId: partner.id,
      },
    });

    expect(submission).not.toBeNull();
    expect(submission?.status).toBe("draft");
    expect(submission?.performanceCount).toBe(1);
    expect(submission?.completedAt).toBeNull();
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

    const workflow = await prisma.workflow.findFirst({
      where: { bounty: { id: bounty.id } },
    });

    expect(workflow).not.toBeNull();

    await prisma.workflow.update({
      where: { id: workflow!.id },
      data: { disabledAt: new Date() },
    });

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
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

    const submission = await prisma.bountySubmission.findFirst({
      where: {
        bountyId: bounty.id,
        partnerId: partner.id,
      },
    });

    expect(submission).toBeNull();
  });

  test("No duplicate execution on multiple triggers", { timeout: 90000 }, async () => {
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

    const { status: partnerStatus, data: partner } = await http.post<
      EnrolledPartnerProps
    >({
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
      bountyId: bounty.id,
      partnerId: partner.id,
      expectedStatus: "submitted",
      minPerformanceCount: 2,
    });

    const submissions = await prisma.bountySubmission.findMany({
      where: {
        bountyId: bounty.id,
        partnerId: partner.id,
      },
    });

    expect(submissions).toHaveLength(1);
    expect(submissions[0].status).toBe("submitted");
  });
});

import { Bounty } from "@dub/prisma/client";
import { E2E_PARTNER_GROUP } from "tests/utils/resource";
import { describe, expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

// start 5 mins from now to make sure the bounty is fully deleted so it doesn't trigger email sends
const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

const submissionBounty = {
  name: "Submission Bounty",
  description: "some description about the bounty",
  type: "submission",
  startsAt,
  endsAt: null,
  rewardAmount: 1000,
  submissionRequirements: ["image", "url"],
};

const performanceBounty = {
  name: "Earn $10 after generating 100 leads",
  description: "some description about the bounty",
  type: "performance",
  startsAt,
  endsAt: null,
  rewardAmount: 1000,
  currentStatsOnly: false,
};

describe.sequential("/bounties/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let submissionBountyId = "";

  test("POST /bounties - performance based", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...performanceBounty,
        groupIds: [E2E_PARTNER_GROUP.id],
        performanceCondition: {
          attribute: "totalLeads",
          operator: "gte",
          value: 100,
        },
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...performanceBounty,
    });

    onTestFinished(async () => {
      await h.deleteBounty(bounty.id);
    });
  });

  test("POST /bounties - submission based", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...submissionBounty,
        groupIds: [E2E_PARTNER_GROUP.id],
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...submissionBounty,
    });

    submissionBountyId = bounty.id;
  });

  test("POST /bounties - submission based with rewardDescription", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...submissionBounty,
        groupIds: [E2E_PARTNER_GROUP.id],
        rewardAmount: null,
        rewardDescription: "some reward description",
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...submissionBounty,
      rewardAmount: null,
      rewardDescription: "some reward description",
    });

    onTestFinished(async () => {
      await h.deleteBounty(bounty.id);
    });
  });

  test("POST /bounties - performance based with currentStatsOnly set to true", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...performanceBounty,
        groupIds: [E2E_PARTNER_GROUP.id],
        currentStatsOnly: true,
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...performanceBounty,
      currentStatsOnly: true,
    });

    onTestFinished(async () => {
      await h.deleteBounty(bounty.id);
    });
  });

  test("POST /bounties - invalid group IDs", async () => {
    const { status, data } = await http.post({
      path: "/bounties",
      body: {
        ...submissionBounty,
        groupIds: ["invalid-group-id"],
      },
    });

    expect(status).toEqual(400);
    expect(data).toMatchObject({
      error: {
        message: "Invalid group IDs detected: invalid-group-id",
        code: "bad_request",
      },
    });
  });

  test("GET /bounties/{bountyId}", async () => {
    const { status, data: bounty } = await http.get<Bounty>({
      path: `/bounties/${submissionBountyId}`,
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...submissionBounty,
    });
  });

  test("GET /bounties", async () => {
    const { status, data: bounties } = await http.get<Bounty[]>({
      path: `/bounties`,
    });

    expect(status).toEqual(200);
    expect(bounties.length).toBeGreaterThanOrEqual(1);
  });

  test("PATCH /bounties/{bountyId}", async () => {
    const toUpdate = {
      name: "Submission Bounty Updated",
      endsAt: new Date().toISOString(),
      rewardAmount: 2000,
      submissionRequirements: ["image"],
    };

    const { status, data: bounty } = await http.patch<Bounty>({
      path: `/bounties/${submissionBountyId}`,
      body: {
        ...toUpdate,
        type: "performance", // should skip the type update
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...submissionBounty,
      ...toUpdate,
    });
  });

  test("DELETE /bounties/{bountyId}", async () => {
    const { status, data: bounty } = await http.delete<{ id: string }>({
      path: `/bounties/${submissionBountyId}`,
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: submissionBountyId,
    });
  });
});

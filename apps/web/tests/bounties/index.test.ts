import { Bounty } from "@dub/prisma/client";
import { describe, expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const submissionBounty = {
  name: "Submission Bounty",
  description: "some description about the bounty",
  type: "submission",
  startsAt: new Date().toISOString(),
  endsAt: null,
  rewardAmount: 1000,
  submissionRequirements: ["image", "url"],
};

const performanceBounty = {
  name: "Performance Bounty",
  description: "some description about the bounty",
  type: "performance",
  startsAt: new Date().toISOString(),
  endsAt: null,
  rewardAmount: 1000,
};

const BOUNTY_GROUP_ID = "grp_1K3TDVB6NS9PRARMTTXZSPQ2D";

describe.sequential.skip("/bounties/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let bountyId = "";

  test("POST /bounties - performance based", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...performanceBounty,
        groupIds: [BOUNTY_GROUP_ID],
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
        groupIds: [BOUNTY_GROUP_ID],
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...submissionBounty,
    });

    bountyId = bounty.id;
  });

  test("GET /bounties/{bountyId}", async () => {
    const { status, data: bounty } = await http.get<Bounty>({
      path: `/bounties/${bountyId}`,
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
      path: `/bounties/${bountyId}`,
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
      path: `/bounties/${bountyId}`,
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: bountyId,
    });
  });
});

import { Bounty } from "@dub/prisma/client";
import { describe, expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const submissionBounty = {
  name: "Submission Bounty",
  description: "some description about the bounty",
  type: "submission",
  endsAt: null,
  rewardAmount: 1000,
  submissionRequirements: ["image", "url"],
};

const performanceBounty = {
  name: "Performance Bounty",
  description: "some description about the bounty",
  type: "performance",
  endsAt: null,
  rewardAmount: 1000,
};

const BOUNTY_GROUP_ID = "grp_1K2E25381GVMG7HHM057TB92F";

describe.sequential("/bounties/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  // start 5 mins from now to make sure the bounty is fully deleted so it doesn't trigger email sends
  const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  let bountyId = "";

  test("POST /bounties - performance based", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...performanceBounty,
        startsAt,
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
        startsAt,
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

  test("POST /bounties - invalid group IDs", async () => {
    const { status, data } = await http.post({
      path: "/bounties",
      body: {
        ...submissionBounty,
        startsAt,
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

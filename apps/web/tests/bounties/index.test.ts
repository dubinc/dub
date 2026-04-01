import { Bounty } from "@dub/prisma/client";
import { addDays, addMonths, subDays } from "date-fns";
import { E2E_PARTNER_GROUP } from "tests/utils/resource";
import { describe, expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

// start 5 mins from now to make sure the bounty is fully deleted so it doesn't trigger email sends
const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

const performanceBounty = {
  name: "Earn $10 after generating 100 leads",
  description: "some description about the bounty",
  type: "performance",
  startsAt,
  endsAt: null,
  rewardAmount: 1000,
  performanceScope: "new",
};

const submissionBounty = {
  name: "Submission Bounty",
  description: "some description about the bounty",
  type: "submission",
  startsAt,
  endsAt: null,
  submissionsOpenAt: null,
  rewardAmount: 1000,
  submissionRequirements: {
    image: {
      max: 4,
    },
    url: {
      max: 10,
    },
  },
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

  test("POST /bounties - performance based with performanceScope set to new", async () => {
    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...performanceBounty,
        groupIds: [E2E_PARTNER_GROUP.id],
        performanceScope: "new",
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...performanceBounty,
      performanceScope: "new",
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

  test("POST /bounties - submission based with submissionsOpenAt", async () => {
    const now = new Date();
    const startsAt = addDays(now, 1);
    const endsAt = addDays(startsAt, 30);
    const submissionsOpenAt = subDays(endsAt, 2);

    const { status, data: bounty } = await http.post<Bounty>({
      path: "/bounties",
      body: {
        ...submissionBounty,
        startsAt,
        endsAt,
        submissionsOpenAt,
        groupIds: [E2E_PARTNER_GROUP.id],
      },
    });

    expect(status).toEqual(200);
    expect(bounty).toMatchObject({
      id: expect.any(String),
      ...submissionBounty,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      submissionsOpenAt: submissionsOpenAt.toISOString(),
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
    const now = new Date();
    const endsAt = addDays(now, 30);

    const toUpdate = {
      name: "Submission Bounty Updated",
      endsAt: endsAt.toISOString(),
      rewardAmount: 2000,
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

describe.sequential(
  "/bounties - multiple submissions & frequency",
  async () => {
    const h = new IntegrationHarness();
    const { http } = await h.init();

    const bountyStartsAt = new Date(Date.now() + 5 * 60 * 1000);
    const bountyEndsAt = addMonths(bountyStartsAt, 1);

    const base = {
      name: "Multi-Submission Bounty",
      type: "submission",
      startsAt: bountyStartsAt.toISOString(),
      endsAt: bountyEndsAt.toISOString(),
      rewardAmount: 1000,
      submissionRequirements: { image: { max: 4 } },
      groupIds: [E2E_PARTNER_GROUP.id],
    };

    let bountyId = "";

    test("POST /bounties - maxSubmissions persists for submission bounty", async () => {
      const { status, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        body: { ...base, maxSubmissions: 5 },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({
        id: expect.any(String),
        maxSubmissions: 5,
        submissionFrequency: null,
      });

      onTestFinished(async () => {
        await h.deleteBounty(bounty.id);
      });
    });

    test("POST /bounties - submissionFrequency 'week' with maxSubmissions", async () => {
      const { status, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        body: { ...base, maxSubmissions: 4, submissionFrequency: "week" },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({
        maxSubmissions: 4,
        submissionFrequency: "week",
      });

      onTestFinished(async () => {
        await h.deleteBounty(bounty.id);
      });
    });

    test("POST /bounties - submissionFrequency 'month' with maxSubmissions", async () => {
      const { status, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        body: { ...base, maxSubmissions: 3, submissionFrequency: "month" },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({
        maxSubmissions: 3,
        submissionFrequency: "month",
      });

      bountyId = bounty.id;
    });

    test("POST /bounties - maxSubmissions and submissionFrequency are ignored for performance bounties", async () => {
      const { status, data: bounty } = await http.post<Bounty>({
        path: "/bounties",
        body: {
          type: "performance",
          startsAt: bountyStartsAt.toISOString(),
          endsAt: null,
          rewardAmount: 1000,
          performanceScope: "new",
          groupIds: [E2E_PARTNER_GROUP.id],
          performanceCondition: {
            attribute: "totalLeads",
            operator: "gte",
            value: 50,
          },
          maxSubmissions: 5,
          submissionFrequency: "week",
        },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({
        maxSubmissions: 1,
        submissionFrequency: null,
      });

      onTestFinished(async () => {
        await h.deleteBounty(bounty.id);
      });
    });

    test("POST /bounties - maxSubmissions below minimum (1) is rejected", async () => {
      const { status } = await http.post({
        path: "/bounties",
        body: { ...base, maxSubmissions: 1 },
      });

      expect(status).toEqual(422);
    });

    test("POST /bounties - maxSubmissions above maximum (50) is rejected", async () => {
      const { status } = await http.post({
        path: "/bounties",
        body: { ...base, maxSubmissions: 51 },
      });

      expect(status).toEqual(422);
    });

    test("POST /bounties - submissionFrequency without maxSubmissions is rejected", async () => {
      const { status, data } = await http.post({
        path: "/bounties",
        body: { ...base, submissionFrequency: "week" },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message:
            "maxSubmissions is required when submissionFrequency is set.",
        },
      });
    });

    test("POST /bounties - submissionFrequency without endsAt is rejected", async () => {
      const { status, data } = await http.post({
        path: "/bounties",
        body: {
          ...base,
          endsAt: null,
          maxSubmissions: 4,
          submissionFrequency: "week",
        },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message: "An end date is required when submissionFrequency is set.",
        },
      });
    });

    test("POST /bounties - submissionsOpenAt without endsAt is rejected", async () => {
      const submissionsOpenAt = addDays(bountyStartsAt, 5).toISOString();

      const { status, data } = await http.post({
        path: "/bounties",
        body: { ...base, endsAt: null, submissionsOpenAt },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message:
            "An end date is required to determine when the submission window opens.",
        },
      });
    });

    test("POST /bounties - submissionsOpenAt before startsAt is rejected", async () => {
      const submissionsOpenAt = subDays(bountyStartsAt, 1).toISOString();

      const { status, data } = await http.post({
        path: "/bounties",
        body: { ...base, submissionsOpenAt },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message:
            "Bounty submissions open date (submissionsOpenAt) must be on or after start date (startsAt).",
        },
      });
    });

    test("POST /bounties - submissionsOpenAt after endsAt is rejected", async () => {
      const submissionsOpenAt = addDays(bountyEndsAt, 1).toISOString();

      const { status, data } = await http.post({
        path: "/bounties",
        body: { ...base, submissionsOpenAt },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message:
            "Bounty submissions open date (submissionsOpenAt) must be on or before end date (endsAt).",
        },
      });
    });

    test("PATCH /bounties/{bountyId} - update maxSubmissions", async () => {
      const { status, data: bounty } = await http.patch<Bounty>({
        path: `/bounties/${bountyId}`,
        body: { maxSubmissions: 6 },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({ maxSubmissions: 6 });
    });

    test("PATCH /bounties/{bountyId} - update submissionFrequency", async () => {
      const { status, data: bounty } = await http.patch<Bounty>({
        path: `/bounties/${bountyId}`,
        body: { submissionFrequency: "day" },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({ submissionFrequency: "day" });
    });

    test("PATCH /bounties/{bountyId} - clear submissionFrequency to null", async () => {
      const { status, data: bounty } = await http.patch<Bounty>({
        path: `/bounties/${bountyId}`,
        body: { submissionFrequency: null },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({ submissionFrequency: null });
    });

    test("PATCH /bounties/{bountyId} - clear maxSubmissions to null", async () => {
      const { status, data: bounty } = await http.patch<Bounty>({
        path: `/bounties/${bountyId}`,
        body: { maxSubmissions: null },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({ maxSubmissions: 1 });
    });

    test("PATCH /bounties/{bountyId} - update submissionsOpenAt", async () => {
      const submissionsOpenAt = addDays(bountyStartsAt, 5).toISOString();

      const { status, data: bounty } = await http.patch<Bounty>({
        path: `/bounties/${bountyId}`,
        body: { submissionsOpenAt },
      });

      expect(status).toEqual(200);
      expect(bounty).toMatchObject({
        submissionsOpenAt: expect.any(String),
      });
    });

    test("PATCH /bounties/{bountyId} - submissionFrequency requires endsAt on the bounty", async () => {
      const { status: clearStatus } = await http.patch({
        path: `/bounties/${bountyId}`,
        body: { endsAt: null },
      });
      expect(clearStatus).toEqual(200);

      const { status, data } = await http.patch({
        path: `/bounties/${bountyId}`,
        body: { submissionFrequency: "week", maxSubmissions: 4 },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message: "An end date is required when submissionFrequency is set.",
        },
      });
    });

    test("PATCH /bounties/{bountyId} - submissionsOpenAt without endsAt is rejected", async () => {
      const submissionsOpenAt = addDays(bountyStartsAt, 5).toISOString();

      const { status, data } = await http.patch({
        path: `/bounties/${bountyId}`,
        body: { submissionsOpenAt },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          message:
            "An end date is required to determine when the submission window opens.",
        },
      });
    });

    test("PATCH /bounties/{bountyId} - maxSubmissions below minimum (1) is rejected", async () => {
      const { status } = await http.patch({
        path: `/bounties/${bountyId}`,
        body: { maxSubmissions: 1 },
      });

      expect(status).toEqual(422);
    });

    test("PATCH /bounties/{bountyId} - maxSubmissions above maximum (51) is rejected", async () => {
      const { status } = await http.patch({
        path: `/bounties/${bountyId}`,
        body: { maxSubmissions: 51 },
      });

      expect(status).toEqual(422);
    });

    test("DELETE /bounties/{bountyId}", async () => {
      const { status } = await http.delete({ path: `/bounties/${bountyId}` });
      expect(status).toEqual(200);
    });
  },
);

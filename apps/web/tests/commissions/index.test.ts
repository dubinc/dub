import { CommissionResponse } from "@/lib/types";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const expectedCommission = {
  id: expect.any(String),
  amount: expect.any(Number),
  earnings: expect.any(Number),
  status: expect.any(String),
  currency: expect.any(String),
  type: expect.any(String),
  quantity: expect.any(Number),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  partner: expect.any(Object),
  customer: expect.any(Object),
};

describe.sequential("/commissions/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let testCommissionId: string;
  let testLeadCommissionId: string;
  let testPaidCommissionId: string;

  test("GET /commissions", async () => {
    const { status, data: commissions } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        status: "processed",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(commissions)).toBe(true);
    expect(commissions.length).toBeGreaterThan(0);
    expect(commissions[0]).toMatchObject(expectedCommission);

    // Store the first sale and lead commission's ID for subsequent tests
    testCommissionId = commissions.find((c) => c.type === "sale")!.id;
    testLeadCommissionId = commissions.find((c) => c.type === "lead")!.id;
  });

  test("GET /commissions with filters", async () => {
    // Get paid commissions
    const { status: paidStatus, data: paidCommissions } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "paid",
        page: "1",
        pageSize: "1",
      },
    });

    expect(paidStatus).toEqual(200);
    expect(Array.isArray(paidCommissions)).toBe(true);
    expect(paidCommissions.length).toBeGreaterThan(0);
    expect(paidCommissions[0]).toMatchObject(expectedCommission);
    testPaidCommissionId = paidCommissions[0].id;
  });

  test("PATCH /commissions/{id} - update amount", async () => {
    const toUpdate = {
      amount: 5000, // $50.00 in cents
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission).toMatchObject({
      ...expectedCommission,
      amount: toUpdate.amount,
    });
  });

  test("PATCH /commissions/{id} - modify amount", async () => {
    const toUpdate = {
      modifyAmount: 1000, // Add $10.00 to existing amount
      currency: "usd",
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission.amount).toEqual(6000);
  });

  test("PATCH /commissions/{id} - foreign currency conversion", async () => {
    const toUpdate = {
      amount: 1437, // approximately 1000 USD cents
      currency: "jpy",
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission.currency).toEqual("usd");
    expect(commission.amount).toBeGreaterThanOrEqual(900); // 900 cents
    expect(commission.amount).toBeLessThanOrEqual(1100); // 1100 cents
  });

  test("PATCH /commissions/{id} - error on lead commission", async () => {
    const toUpdate = {
      amount: 5000,
    };

    const response = await http.patch<CommissionResponse>({
      path: `/commissions/${testLeadCommissionId}`,
      body: toUpdate,
    });

    expect(response.status).toEqual(400);
    expect(response.data["error"].message).toContain("not a sale commission.");
  });

  test("PATCH /commissions/{id} - error on paid commission", async () => {
    const toUpdate = {
      amount: 5000,
    };

    const response = await http.patch<CommissionResponse>({
      path: `/commissions/${testPaidCommissionId}`,
      body: toUpdate,
    });

    expect(response.status).toEqual(400);
    expect(response.data["error"].message).toContain("has already been paid");
  });

  test("PATCH /commissions/{id} - update status to refunded", async () => {
    const toUpdate = {
      status: "refunded",
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission).toMatchObject({
      ...expectedCommission,
      status: toUpdate.status,
    });
  });

  test("GET /commissions - offset pagination", async () => {
    // First, fetch baseline to establish expected order
    const { status: baselineStatus, data: allCommissions } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "processed",
        sortBy: "createdAt",
        sortOrder: "desc",
        pageSize: "25",
      },
    });

    expect(baselineStatus).toEqual(200);
    const baselineIds = allCommissions.map((c) => c.id);
    const baselineDates = allCommissions.map((c) =>
      new Date(c.createdAt).getTime(),
    );

    // Verify baseline is sorted correctly (descending)
    for (let i = 0; i < baselineDates.length - 1; i++) {
      expect(baselineDates[i]).toBeGreaterThanOrEqual(baselineDates[i + 1]);
    }

    // Now test pagination
    const { status: status1, data: page1 } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "processed",
        page: "1",
        pageSize: "2",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });

    expect(status1).toEqual(200);
    expect(Array.isArray(page1)).toBe(true);
    expect(page1.length).toBeLessThanOrEqual(2);

    const page1Ids = page1.map((c) => c.id);

    // Verify page1 IDs match the first 2 IDs from baseline
    expect(page1Ids).toEqual(baselineIds.slice(0, page1.length));

    // Verify page1 is in correct order
    if (page1.length > 1) {
      const page1Dates = page1.map((c) => new Date(c.createdAt).getTime());
      expect(page1Dates[0]).toBeGreaterThanOrEqual(page1Dates[1]);
    }

    if (page1.length === 2 && baselineIds.length >= 4) {
      // Fetch second page
      const { status: status2, data: page2 } = await http.get<
        CommissionResponse[]
      >({
        path: "/commissions",
        query: {
          status: "processed",
          page: "2",
          pageSize: "2",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });

      expect(status2).toEqual(200);
      expect(Array.isArray(page2)).toBe(true);
      expect(page2.length).toBeLessThanOrEqual(2);

      const page2Ids = page2.map((c) => c.id);

      // Verify page2 IDs match the next 2 IDs from baseline
      expect(page2Ids).toEqual(baselineIds.slice(2, 4));

      // Verify no overlap between pages
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  test("GET /commissions - cursor pagination with startingAfter", async () => {
    // First, fetch baseline to establish expected order
    const { status: baselineStatus, data: allCommissions } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "processed",
        pageSize: "25",
      },
    });

    expect(baselineStatus).toEqual(200);
    const baselineIds = allCommissions.map((c) => c.id);
    const baselineDates = allCommissions.map((c) =>
      new Date(c.createdAt).getTime(),
    );

    // Verify baseline is sorted correctly (descending by createdAt for cursor pagination)
    for (let i = 0; i < baselineDates.length - 1; i++) {
      expect(baselineDates[i]).toBeGreaterThanOrEqual(baselineDates[i + 1]);
    }

    // Fetch first page
    const { status: status1, data: page1 } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "processed",
        pageSize: "2",
      },
    });

    expect(status1).toEqual(200);
    expect(Array.isArray(page1)).toBe(true);
    expect(page1.length).toBeLessThanOrEqual(2);

    const page1Ids = page1.map((c) => c.id);

    // Verify page1 IDs match the first 2 IDs from baseline
    expect(page1Ids).toEqual(baselineIds.slice(0, page1.length));

    if (page1.length === 2 && baselineIds.length >= 4) {
      const lastItemId = page1[page1.length - 1].id;

      // Fetch next page using cursor
      const { status: status2, data: page2 } = await http.get<
        CommissionResponse[]
      >({
        path: "/commissions",
        query: {
          status: "processed",
          pageSize: "2",
          startingAfter: lastItemId,
        },
      });

      expect(status2).toEqual(200);
      expect(Array.isArray(page2)).toBe(true);
      expect(page2.length).toBeLessThanOrEqual(2);

      const page2Ids = page2.map((c) => c.id);

      // Verify page2 IDs match the next 2 IDs from baseline
      expect(page2Ids).toEqual(baselineIds.slice(2, 4));

      // Verify no overlap between pages
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);

      // Verify combined pages maintain order
      const combinedIds = [...page1Ids, ...page2Ids];
      const expectedCombined = baselineIds.slice(0, 4);
      expect(combinedIds).toEqual(expectedCombined);
    }
  });

  test("GET /commissions - cursor pagination with endingBefore", async () => {
    // First, fetch baseline to establish expected order
    const { status: baselineStatus, data: allCommissions } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "processed",
        pageSize: "25",
      },
    });

    expect(baselineStatus).toEqual(200);
    const baselineIds = allCommissions.map((c) => c.id);
    const baselineDates = allCommissions.map((c) =>
      new Date(c.createdAt).getTime(),
    );

    // Verify baseline is sorted correctly (descending by createdAt)
    for (let i = 0; i < baselineDates.length - 1; i++) {
      expect(baselineDates[i]).toBeGreaterThanOrEqual(baselineDates[i + 1]);
    }

    // Fetch a page first (starting from index 2 to have items before it)
    if (baselineIds.length >= 3) {
      const { status: status1, data: page1 } = await http.get<
        CommissionResponse[]
      >({
        path: "/commissions",
        query: {
          status: "processed",
          pageSize: "3",
        },
      });

      expect(status1).toEqual(200);
      expect(Array.isArray(page1)).toBe(true);
      expect(page1.length).toBeGreaterThan(0);

      const page1Ids = page1.map((c) => c.id);

      // Verify page1 matches baseline
      expect(page1Ids).toEqual(baselineIds.slice(0, page1.length));

      if (page1.length > 1) {
        const firstItemId = page1[0].id;

        // Fetch previous page using endingBefore
        const { status: status2, data: page2 } = await http.get<
          CommissionResponse[]
        >({
          path: "/commissions",
          query: {
            status: "processed",
            pageSize: "2",
            endingBefore: firstItemId,
          },
        });

        expect(status2).toEqual(200);
        expect(Array.isArray(page2)).toBe(true);
        expect(page2.length).toBeLessThanOrEqual(2);

        const page2Ids = page2.map((c) => c.id);

        // Verify no overlap
        const overlap = page1Ids.filter((id) => page2Ids.includes(id));
        expect(overlap.length).toBe(0);

        // Verify results are before the cursor (page2 should be empty or have items with later dates)
        if (page2.length > 0) {
          const firstPage1Date = new Date(page1[0].createdAt).getTime();
          const lastPage2Date = new Date(
            page2[page2.length - 1].createdAt,
          ).getTime();
          expect(lastPage2Date).toBeLessThanOrEqual(firstPage1Date);
        }
      }
    }
  });

  test("GET /commissions - error when both startingAfter and endingBefore provided", async () => {
    const { status, data } = await http.get<{ error: { message: string } }>({
      path: "/commissions",
      query: {
        status: "processed",
        pageSize: "2",
        startingAfter: testCommissionId,
        endingBefore: testCommissionId,
      },
    });

    expect(status).toEqual(422);
    expect(data.error.message).toContain(
      "You cannot use both startingAfter and endingBefore at the same time",
    );
  });
});

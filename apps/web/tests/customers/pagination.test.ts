import { Customer } from "@/lib/types";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("/customers/** - pagination", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("GET /customers - offset pagination", async () => {
    // First, fetch baseline to establish expected order
    const { status: baselineStatus, data: allCustomers } = await http.get<
      Customer[]
    >({
      path: "/customers",
      query: {
        sortBy: "createdAt",
        sortOrder: "desc",
        pageSize: "25",
      },
    });

    expect(baselineStatus).toEqual(200);
    const baselineIds = allCustomers.map((c) => c.id);
    const baselineDates = allCustomers.map((c) =>
      new Date(c.createdAt).getTime(),
    );

    // Verify baseline is sorted correctly (descending)
    for (let i = 0; i < baselineDates.length - 1; i++) {
      expect(baselineDates[i]).toBeGreaterThanOrEqual(baselineDates[i + 1]);
    }

    // Now test pagination
    const { status: status1, data: page1 } = await http.get<Customer[]>({
      path: "/customers",
      query: {
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
      const { status: status2, data: page2 } = await http.get<Customer[]>({
        path: "/customers",
        query: {
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

  test("GET /customers - cursor pagination with startingAfter", async () => {
    // First, fetch baseline to establish expected order
    const { status: baselineStatus, data: allCustomers } = await http.get<
      Customer[]
    >({
      path: "/customers",
      query: {
        pageSize: "25",
      },
    });

    expect(baselineStatus).toEqual(200);
    const baselineIds = allCustomers.map((c) => c.id);
    const baselineDates = allCustomers.map((c) =>
      new Date(c.createdAt).getTime(),
    );

    // Verify baseline is sorted correctly (descending by createdAt for cursor pagination)
    for (let i = 0; i < baselineDates.length - 1; i++) {
      expect(baselineDates[i]).toBeGreaterThanOrEqual(baselineDates[i + 1]);
    }

    // Fetch first page
    const { status: status1, data: page1 } = await http.get<Customer[]>({
      path: "/customers",
      query: {
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
      const { status: status2, data: page2 } = await http.get<Customer[]>({
        path: "/customers",
        query: {
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

  test("GET /customers - cursor pagination with endingBefore", async () => {
    // First, fetch baseline to establish expected order
    const { status: baselineStatus, data: allCustomers } = await http.get<
      Customer[]
    >({
      path: "/customers",
      query: {
        pageSize: "25",
      },
    });

    expect(baselineStatus).toEqual(200);
    const baselineIds = allCustomers.map((c) => c.id);
    const baselineDates = allCustomers.map((c) =>
      new Date(c.createdAt).getTime(),
    );

    // Verify baseline is sorted correctly (descending by createdAt)
    for (let i = 0; i < baselineDates.length - 1; i++) {
      expect(baselineDates[i]).toBeGreaterThanOrEqual(baselineDates[i + 1]);
    }

    // Fetch a page first (starting from index 2 to have items before it)
    if (baselineIds.length >= 3) {
      const { status: status1, data: page1 } = await http.get<Customer[]>({
        path: "/customers",
        query: {
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
        const { status: status2, data: page2 } = await http.get<Customer[]>({
          path: "/customers",
          query: {
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

  test("GET /customers - error when both startingAfter and endingBefore provided", async () => {
    const { status, data } = await http.get<{ error: { message: string } }>({
      path: "/customers",
      query: {
        pageSize: "2",
        startingAfter: "customerId",
        endingBefore: "customerId",
      },
    });

    expect(status).toEqual(422);
    expect(data.error.message).toContain(
      "You cannot use both startingAfter and endingBefore at the same time",
    );
  });
});

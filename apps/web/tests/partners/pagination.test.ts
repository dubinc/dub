import { EnrolledPartnerProps } from "@/lib/types";
import { beforeAll, describe, expect, test } from "vitest";
import { expectNoOverlap } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("/partners/** - pagination", async () => {
  const h = new IntegrationHarness();
  let http: IntegrationHarness["http"];
  let baseline: EnrolledPartnerProps[];
  let baselineIds: string[];

  const commonQuery = {
    pageSize: "5",
    sortBy: "totalSaleAmount",
    sortOrder: "desc",
  };

  beforeAll(async () => {
    ({ http } = await h.init());

    const { status, data } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: { ...commonQuery, pageSize: "100" },
    });

    expect(status).toEqual(200);

    baseline = data;
    baselineIds = baseline.map((p) => p.id);
  });

  test("Offset pagination has no duplicate partners across pages", async () => {
    const page1 = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: { ...commonQuery, page: "1" },
    });
    const page2 = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: { ...commonQuery, page: "2" },
    });
    const page3 = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: { ...commonQuery, page: "3" },
    });

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);
    expect(page3.status).toEqual(200);

    expectNoOverlap(page1.data, page2.data);
    expectNoOverlap(page2.data, page3.data);
    expectNoOverlap(page1.data, page3.data);

    const paginatedIds = [...page1.data, ...page2.data, ...page3.data].map(
      (p) => p.id,
    );

    expect(new Set(paginatedIds).size).toBe(paginatedIds.length);
    expect(paginatedIds).toEqual(baselineIds.slice(0, paginatedIds.length));
  });
});

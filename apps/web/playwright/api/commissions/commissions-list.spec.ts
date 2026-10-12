import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { CommissionResponse } from "@/lib/types";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { createPartner } from "../partners/helpers";
import { deleteCommissionPartner } from "./helpers";

test.describe("GET /commissions – metadata query", () => {
  // Shared Prisma seed for this describe; serial so beforeAll runs once per worker group.
  test.describe.configure({ mode: "serial" });

  const seedMetadata: Record<string, string | number | boolean>[] = [
    { plan: "pro", tier: "gold" },
    { plan: "Pro", tier: "silver" },
    { plan: "PRO", seats: 10 },
    { plan: "enterprise", tier: "gold", active: true },
    { plan: "enterprise", seats: 5, active: false },
    { plan: "free", tier: "bronze" },
    { plan: "free", campaign: "Spring" },
    { plan: "starter", seats: 10, active: true },
    { plan: "pro", campaign: "spring" },
    { plan: "enterprise", campaign: "fall", seats: 5 },
  ];

  let partnerId: string | undefined;
  let seeded: {
    id: string;
    metadata: Record<string, string | number | boolean>;
  }[] = [];

  test.beforeAll(async ({ api, program }) => {
    const { status, data } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    expect(status).toEqual(201);
    partnerId = data.id;

    const rows = seedMetadata.map((metadata, i) => ({
      id: createId({ prefix: "cm_" }),
      programId: program.id,
      partnerId: data.id,
      type: "custom" as const,
      amount: 0,
      earnings: 100,
      quantity: 1,
      description: `meta-query-${i}`,
      metadata,
    }));

    await prisma.commission.createMany({ data: rows });
    seeded = rows.map((row) => ({
      id: row.id,
      metadata: row.metadata,
    }));
  });

  test.afterAll(async () => {
    await deleteCommissionPartner({ partnerId });
  });

  function matchingIds(
    predicate: (metadata: Record<string, string | number | boolean>) => boolean,
  ) {
    return seeded
      .filter((row) => predicate(row.metadata))
      .map((row) => row.id)
      .sort();
  }

  async function listCommissions(api: ApiClient, query: string) {
    const { status, data } = await api.get<CommissionResponse[]>(
      `/api/commissions?${new URLSearchParams({
        partnerId: partnerId!,
        pageSize: "100",
        query,
      })}`,
    );

    expect(status).toEqual(200);
    return data.map((commission) => commission.id).sort();
  }

  test("filters with =", async ({ api }) => {
    expect(await listCommissions(api, "metadata['plan']='pro'")).toEqual(
      matchingIds((m) => m.plan === "pro"),
    );
  });

  test("filters with : as equals", async ({ api }) => {
    expect(await listCommissions(api, "metadata['plan']:pro")).toEqual(
      matchingIds((m) => m.plan === "pro"),
    );
  });

  test("filters are case-sensitive", async ({ api }) => {
    expect(await listCommissions(api, "metadata['plan']='Pro'")).toEqual(
      matchingIds((m) => m.plan === "Pro"),
    );

    expect(await listCommissions(api, "metadata['plan']='PRO'")).toEqual(
      matchingIds((m) => m.plan === "PRO"),
    );

    expect(await listCommissions(api, "metadata['campaign']='spring'")).toEqual(
      matchingIds((m) => m.campaign === "spring"),
    );

    expect(await listCommissions(api, "metadata['campaign']='Spring'")).toEqual(
      matchingIds((m) => m.campaign === "Spring"),
    );
  });

  test("filters with !=", async ({ api }) => {
    expect(await listCommissions(api, "metadata['plan']!='free'")).toEqual(
      matchingIds((m) => m.plan !== "free"),
    );
  });

  test("filters with AND", async ({ api }) => {
    expect(
      await listCommissions(
        api,
        "metadata['plan']='pro' AND metadata['tier']='gold'",
      ),
    ).toEqual(matchingIds((m) => m.plan === "pro" && m.tier === "gold"));
  });

  test("filters with OR", async ({ api }) => {
    expect(
      await listCommissions(
        api,
        "metadata['plan']='pro' OR metadata['plan']='enterprise'",
      ),
    ).toEqual(matchingIds((m) => m.plan === "pro" || m.plan === "enterprise"));
  });

  test("filters with AND on campaign", async ({ api }) => {
    expect(
      await listCommissions(
        api,
        "metadata['plan']='pro' AND metadata['campaign']='spring'",
      ),
    ).toEqual(matchingIds((m) => m.plan === "pro" && m.campaign === "spring"));
  });

  test("filters with OR on campaign", async ({ api }) => {
    expect(
      await listCommissions(
        api,
        "metadata['campaign']='spring' OR metadata['campaign']='fall'",
      ),
    ).toEqual(
      matchingIds((m) => m.campaign === "spring" || m.campaign === "fall"),
    );
  });

  test("does not match numeric metadata values stored as numbers", async ({
    api,
  }) => {
    expect(await listCommissions(api, "metadata['seats']='10'")).toEqual([]);
    expect(await listCommissions(api, "metadata['seats']='5'")).toEqual([]);
  });

  test("does not match boolean metadata values stored as booleans", async ({
    api,
  }) => {
    expect(await listCommissions(api, "metadata['active']='true'")).toEqual([]);
    expect(await listCommissions(api, "metadata['active']='false'")).toEqual(
      [],
    );
  });

  const invalidQueryCases = [
    {
      name: "rejects nested metadata keys",
      query: "metadata['a']['b']='value'",
      message:
        "Invalid metadata query. Use top-level keys only, e.g. `metadata['key']='value'`.",
    },
    {
      name: "rejects mixed AND and OR",
      query: "metadata['a']='1' AND metadata['b']='2' OR metadata['c']='3'",
      message: "Metadata query cannot mix AND and OR.",
    },
    {
      name: "rejects unsupported comparison operators",
      query: "metadata['seats']>5",
      message: "Metadata query only supports `=` and `!=` operators.",
    },
    {
      name: "rejects non-metadata fields",
      query: "status:active",
      message:
        "Invalid metadata query. Use top-level keys only, e.g. `metadata['key']='value'`.",
    },
  ];

  for (const { name, query, message } of invalidQueryCases) {
    test(name, async ({ api }) => {
      expect(
        await api.get(
          `/api/commissions?${new URLSearchParams({
            partnerId: partnerId!,
            query,
          })}`,
        ),
      ).toEqual(
        apiError({
          code: "unprocessable_entity",
          message,
        }),
      );
    });
  }
});

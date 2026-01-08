import { fraudGroupSchema } from "@/lib/zod/schemas/fraud";
import { FraudEventStatus, FraudRuleType } from "@dub/prisma/client";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { IntegrationHarness } from "../utils/integration";
import { E2E_FRAUD_PARTNER } from "../utils/resource";

type FraudGroup = z.infer<typeof fraudGroupSchema>;

describe.concurrent("/fraud/groups", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("GET /fraud/groups - list with default parameters", async () => {
    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.every((g) => g.status === "pending")).toBe(true);

    const parsed = z.array(fraudGroupSchema).safeParse(data);
    expect(parsed.success).toBe(true);

    // Check required fields exists
    const group = data[0];
    expect(group.id).toBeDefined();
    expect(group.type).toBeDefined();
    expect(group.status).toBeDefined();
    expect(group.lastEventAt).toBeDefined();
    expect(group.eventCount).toBeDefined();
    expect(typeof group.eventCount).toBe("number");
    expect(group.partner).toBeDefined();
  });

  test("GET /fraud/groups - filter by status=pending", async () => {
    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        status: FraudEventStatus.pending,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.every((g) => g.status === "pending")).toBe(true);
  });

  test("GET /fraud/groups - filter by status=resolved", async () => {
    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        status: FraudEventStatus.resolved,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.every((g) => g.status === "resolved")).toBe(true);
  });

  test("GET /fraud/groups - filter by type", async () => {
    const typesToTest = [
      FraudRuleType.customerEmailMatch,
      FraudRuleType.customerEmailSuspiciousDomain,
      FraudRuleType.referralSourceBanned,
      FraudRuleType.paidTrafficDetected,
    ];

    for (const fraudType of typesToTest) {
      const { status, data } = await http.get<FraudGroup[]>({
        path: "/fraud/groups",
        query: {
          type: fraudType,
        },
      });

      expect(status).toEqual(200);
      expect(data.every((g) => g.type === fraudType)).toBe(true);
    }
  });

  test("GET /fraud/groups - filter by partnerId", async () => {
    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        partnerId: E2E_FRAUD_PARTNER.id,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.every((g) => g.partner.id === E2E_FRAUD_PARTNER.id)).toBe(true);
  });

  test("GET /fraud/groups - retrieve specific group by groupId", async () => {
    // First, get a list to find a valid groupId
    const { data: groups } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
    });

    if (groups.length === 0) {
      return;
    }

    const groupId = groups[0].id;

    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        groupId,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe(groupId);
  });

  test("GET /fraud/groups - pagination with custom pageSize", async () => {
    const pageSize = 5;

    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        page: "1",
        pageSize: pageSize.toString(),
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(pageSize);
  });

  test("GET /fraud/groups - combined filters (status + type + partnerId)", async () => {
    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        status: FraudEventStatus.pending,
        type: FraudRuleType.customerEmailMatch,
        partnerId: E2E_FRAUD_PARTNER.id,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      expect(
        data.every(
          (g) =>
            g.status === "pending" &&
            g.type === FraudRuleType.customerEmailMatch &&
            g.partner.id === E2E_FRAUD_PARTNER.id,
        ),
      ).toBe(true);
    }
  });

  test("GET /fraud/groups - non-existent groupId returns empty array", async () => {
    const nonExistentGroupId = "frg_nonexistent123456789";

    const { status, data } = await http.get<FraudGroup[]>({
      path: "/fraud/groups",
      query: {
        groupId: nonExistentGroupId,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

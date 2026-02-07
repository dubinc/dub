import { clickEventResponseSchema } from "@/lib/zod/schemas/clicks";
import { leadEventResponseSchema } from "@/lib/zod/schemas/leads";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";

describe.runIf(env.CI).sequential("GET /events", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const workspaceId = workspace.id;

  test("get clicks events", async () => {
    const { status, data } = await http.get<any[]>({
      path: `/events`,
      query: {
        event: "clicks",
        workspaceId,
        interval: "30d",
        domain: "dub.sh",
        key: "checkly-check",
      },
    });

    const responseSchema = z.array(clickEventResponseSchema.strict());
    const parsed = responseSchema.safeParse(data);

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(parsed.success).toBeTruthy();
  });

  test("get leads events", async () => {
    const { status, data } = await http.get<any[]>({
      path: `/events`,
      query: {
        event: "leads",
        workspaceId,
        interval: "30d",
      },
    });

    const responseSchema = z.array(leadEventResponseSchema.strict());
    const parsed = responseSchema.safeParse(data);

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(parsed.success).toBeTruthy();
  });

  test("get sales events", async () => {
    const { status, data } = await http.get<any[]>({
      path: `/events`,
      query: {
        event: "sales",
        workspaceId,
        interval: "30d",
      },
    });

    const responseSchema = z.array(saleEventResponseSchema.strict());
    const parsed = responseSchema.safeParse(data);

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(parsed.success).toBeTruthy();
  });

  describe("Advanced Filters", () => {
    test("filter events by country", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("filter events by multiple countries (IS ONE OF)", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US,CA,GB",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("exclude country (IS NOT)", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "-US",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("filter events by device", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          device: "desktop",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("filter events by utm_source", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          utm_source: "e2e",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("filter events by metadata query", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "sales",
          workspaceId,
          interval: "30d",
          query: "metadata['productId']:premiumProductId",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("combine multiple filters", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
          device: "desktop",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Pagination and Sorting", () => {
    test("sort events by timestamp descending (default)", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          const current = new Date(data[i].timestamp).getTime();
          const next = new Date(data[i + 1].timestamp).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    test("sort events by timestamp ascending", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/events`,
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          sortOrder: "asc",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          const current = new Date(data[i].timestamp).getTime();
          const next = new Date(data[i + 1].timestamp).getTime();
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });
  });
});

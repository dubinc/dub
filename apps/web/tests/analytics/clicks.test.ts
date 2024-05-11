import z from "@/lib/zod";
import { getClickAnalyticsResponse } from "@/lib/zod/schemas";
import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe.runIf(env.CI).sequential("GET /analytics/clicks", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  test("clicks count", async () => {
    const { status, data: clicks } = await http.get<number>({
      path: "/analytics/clicks",
      query: { workspaceId, ...filter },
    });

    expect(status).toEqual(200);
    expect(clicks).toEqual(expect.any(Number));
    expect(clicks).toBeGreaterThanOrEqual(0);
  });

  test("by timeseries", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "timeseries", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["timeseries"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by country", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "country", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["country"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by city", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "city", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["city"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by device", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "device", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["device"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by browser", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "browser", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["browser"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by os", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "os", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["os"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by referer", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "referer", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["referer"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by top_links", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "top_links", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["top_links"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });

  test("by top_urls", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/clicks",
      query: { workspaceId, groupBy: "top_urls", ...filter },
    });

    const parsed = z
      .array(getClickAnalyticsResponse["top_urls"].strict())
      .safeParse(data);

    expect(status).toEqual(200);
    expect(data.length).toBeGreaterThanOrEqual(0);
    expect(parsed.success).toBeTruthy();
  });
});

import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";

describe
  .runIf(env.CI)
  .sequential("GET /analytics (advanced filters)", async () => {
    const h = new IntegrationHarness();
    const { workspace, http } = await h.init();
    const workspaceId = workspace.id;

    describe("groupBy country / device", () => {
      test("single country filter", async () => {
        const { status, data } = await http.get<any[]>({
          path: "/analytics",
          query: {
            event: "clicks",
            groupBy: "countries",
            workspaceId,
            interval: "30d",
            domain: "dub.sh",
            key: "checkly-check",
            country: "US",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.countries.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(parsed.data?.every((item) => item.country === "US")).toBe(true);
      });

      test("multiple countries filter (IS ONE OF)", async () => {
        const { status, data } = await http.get<any[]>({
          path: "/analytics",
          query: {
            event: "clicks",
            groupBy: "countries",
            workspaceId,
            interval: "30d",
            domain: "dub.sh",
            key: "checkly-check",
            country: "US,CA,GB",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.countries.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) =>
            ["US", "CA", "GB"].includes(item.country),
          ),
        ).toBe(true);
      });

      test("exclude country (IS NOT)", async () => {
        const { status, data } = await http.get<any[]>({
          path: "/analytics",
          query: {
            event: "clicks",
            groupBy: "countries",
            workspaceId,
            interval: "30d",
            domain: "dub.sh",
            key: "checkly-check",
            country: "-US",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.countries.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(parsed.data?.every((item) => item.country !== "US")).toBe(true);
      });

      test("exclude multiple countries (IS NOT ONE OF)", async () => {
        const { status, data } = await http.get<any[]>({
          path: "/analytics",
          query: {
            event: "clicks",
            groupBy: "countries",
            workspaceId,
            interval: "30d",
            domain: "dub.sh",
            key: "checkly-check",
            country: "-US,GB",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.countries.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => !["US", "GB"].includes(item.country)),
        ).toBe(true);
      });

      test("multiple devices filter", async () => {
        const { status, data } = await http.get<any[]>({
          path: "/analytics",
          query: {
            event: "clicks",
            groupBy: "devices",
            workspaceId,
            interval: "30d",
            domain: "dub.sh",
            key: "checkly-check",
            device: "mobile,desktop",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.devices.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) =>
            ["Mobile", "Desktop"].includes(item.device),
          ),
        ).toBe(true);
      });

      test("backward compatibility - old format still works", async () => {
        const { status, data } = await http.get<any[]>({
          path: "/analytics",
          query: {
            event: "clicks",
            groupBy: "countries",
            workspaceId,
            interval: "30d",
            domain: "dub.sh",
            key: "checkly-check",
            country: "US",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.countries.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(parsed.data?.every((item) => item.country === "US")).toBe(true);
      });
    });
  });

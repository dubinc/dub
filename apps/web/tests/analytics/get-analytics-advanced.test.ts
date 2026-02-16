import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_PARTNER,
  E2E_PARTNERS,
  E2E_PARTNER_GROUP,
} from "../utils/resource";

describe
  .runIf(env.CI)
  .sequential("GET /analytics (advanced filters)", async () => {
    const h = new IntegrationHarness();
    const { workspace, http } = await h.init();
    const workspaceId = workspace.id;

    describe("groupBy country / device", () => {
      test("single country filter", async () => {
        const { status, data } = await http.get<any[]>({
          path: `/analytics`,
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
          path: `/analytics`,
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
          path: `/analytics`,
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
          path: `/analytics`,
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
          path: `/analytics`,
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
          path: `/analytics`,
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

    describe("filter by partnerId", () => {
      test("single partnerId filter (count)", async () => {
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_partners",
            workspaceId,
            interval: "all",
            partnerId: E2E_PARTNER.id,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_partners.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.partner.id === E2E_PARTNER.id),
        ).toBe(true);
      });

      test("multiple partnerIds filter (IS ONE OF)", async () => {
        const partnerIds = E2E_PARTNERS.map((p) => p.id);
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_partners",
            workspaceId,
            interval: "all",
            partnerId: partnerIds.join(","),
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_partners.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) =>
            partnerIds.some((id) => id === item.partner.id),
          ),
        ).toBe(true);
      });

      test("exclude partnerId (IS NOT)", async () => {
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_partners",
            workspaceId,
            interval: "all",
            partnerId: `-${E2E_PARTNER.id}`,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_partners.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.partner.id !== E2E_PARTNER.id),
        ).toBe(true);
      });

      test("exclude multiple partnerIds (IS NOT ONE OF)", async () => {
        const partnerIds = E2E_PARTNERS.map((p) => p.id);
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_partners",
            workspaceId,
            interval: "all",
            partnerId: `-${partnerIds.join(",")}`,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_partners.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every(
            (item: any) => !partnerIds.some((id) => id === item.partner.id),
          ),
        ).toBe(true);
      });

      test("backward compatibility - single partnerId still works", async () => {
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_partners",
            workspaceId,
            interval: "all",
            partnerId: E2E_PARTNER.id,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_partners.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.partner.id === E2E_PARTNER.id),
        ).toBe(true);
      });
    });

    describe("filter by groupId", () => {
      test("single groupId filter (count)", async () => {
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_groups",
            workspaceId,
            interval: "all",
            groupId: E2E_PARTNER_GROUP.id,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_groups.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.group.id === E2E_PARTNER_GROUP.id),
        ).toBe(true);
      });

      test("exclude groupId (IS NOT)", async () => {
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_groups",
            workspaceId,
            interval: "all",
            groupId: `-${E2E_PARTNER_GROUP.id}`,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_groups.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.group.id !== E2E_PARTNER_GROUP.id),
        ).toBe(true);
      });

      test("backward compatibility - single groupId still works", async () => {
        const { status, data } = await http.get<any>({
          path: `/analytics`,
          query: {
            event: "clicks",
            groupBy: "top_groups",
            workspaceId,
            interval: "all",
            groupId: E2E_PARTNER_GROUP.id,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_groups.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.group.id === E2E_PARTNER_GROUP.id),
        ).toBe(true);
      });
    });
  });

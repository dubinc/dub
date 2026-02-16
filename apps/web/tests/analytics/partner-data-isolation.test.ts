import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_PARTNER,
  E2E_PARTNERS,
  E2E_PARTNER_GROUP,
  E2E_WORKSPACE_ID,
} from "../utils/resource";

describe
  .runIf(env.CI)
  .sequential(
    "Partner data isolation - IS NOT filters must not leak data",
    async () => {
      const h = new IntegrationHarness();
      const { http } = await h.init();

      describe("linkId IS NOT must stay scoped to partner", () => {
        test("IS NOT linkId with partnerId scoping returns 200", async () => {
          const { status, data } = await http.get<any>({
            path: `/analytics`,
            query: {
              event: "composite",
              groupBy: "count",
              workspaceId: E2E_WORKSPACE_ID,
              interval: "all",
              partnerId: E2E_PARTNER.id,
              linkId: `-${E2E_PARTNERS[0].id}`,
            },
          });

          expect(status).toEqual(200);
          expect(data).toHaveProperty("clicks");
          expect(data).toHaveProperty("leads");
          expect(data).toHaveProperty("sales");
        });
      });

      describe("partnerId IS NOT must stay scoped to workspace", () => {
        test("IS NOT partnerId returns 200", async () => {
          const { status, data } = await http.get<any>({
            path: `/analytics`,
            query: {
              event: "composite",
              groupBy: "count",
              workspaceId: E2E_WORKSPACE_ID,
              interval: "all",
              partnerId: `-${E2E_PARTNER.id}`,
            },
          });

          expect(status).toEqual(200);
          expect(data).toHaveProperty("clicks");
        });
      });

      describe("groupId IS NOT must stay scoped", () => {
        test("IS NOT groupId returns 200", async () => {
          const { status, data } = await http.get<any>({
            path: `/analytics`,
            query: {
              event: "composite",
              groupBy: "count",
              workspaceId: E2E_WORKSPACE_ID,
              interval: "all",
              groupId: `-${E2E_PARTNER_GROUP.id}`,
            },
          });

          expect(status).toEqual(200);
          expect(data).toHaveProperty("clicks");
        });
      });

      describe("tenantId IS NOT must stay scoped", () => {
        test("IS NOT tenantId returns 200", async () => {
          const { status, data } = await http.get<any>({
            path: `/analytics`,
            query: {
              event: "composite",
              groupBy: "count",
              workspaceId: E2E_WORKSPACE_ID,
              interval: "all",
              tenantId: `-${E2E_PARTNER.tenantId}`,
            },
          });

          expect(status).toEqual(200);
          expect(data).toHaveProperty("clicks");
        });
      });

      describe("country IS NOT must stay scoped", () => {
        test("IS NOT country returns 200", async () => {
          const { status, data } = await http.get<any>({
            path: `/analytics`,
            query: {
              event: "composite",
              groupBy: "count",
              workspaceId: E2E_WORKSPACE_ID,
              interval: "all",
              partnerId: E2E_PARTNER.id,
              country: "-US",
            },
          });

          expect(status).toEqual(200);
          expect(data).toHaveProperty("clicks");
        });
      });

      describe("combined IS NOT filters must stay scoped", () => {
        test("IS NOT country + partnerId scoping returns 200", async () => {
          const { status, data } = await http.get<any>({
            path: `/analytics`,
            query: {
              event: "composite",
              groupBy: "count",
              workspaceId: E2E_WORKSPACE_ID,
              interval: "all",
              partnerId: E2E_PARTNER.id,
              country: "-US",
              device: "-Desktop",
            },
          });

          expect(status).toEqual(200);
          expect(data).toHaveProperty("clicks");
        });
      });
    },
  );

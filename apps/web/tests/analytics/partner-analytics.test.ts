import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarnessOld } from "../utils/integration-old";
import { E2E_PARTNER, E2E_PROGRAM } from "../utils/resource";

describe
  .runIf(env.CI)
  .sequential(
    "GET /partner-profile/programs/[programId]/analytics",
    async () => {
      const h = new IntegrationHarnessOld();
      const { http } = await h.init();

      test("get top links for partner", async () => {
        const { status, data } = await http.get<any>({
          path: `/partner-profile/programs/${E2E_PROGRAM.id}/analytics`,
          query: {
            groupBy: "top_links",
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_links.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.partnerId === E2E_PARTNER.id),
        ).toBe(true);
      });

      test("get top links for partner (filtered by linkId)", async () => {
        const { status, data } = await http.get<any>({
          path: `/partner-profile/programs/${E2E_PROGRAM.id}/analytics`,
          query: {
            groupBy: "top_links",
            linkId: E2E_PARTNER.link.id,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_links.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.partnerId === E2E_PARTNER.id),
        ).toBe(true);
        expect(
          parsed.data?.every((item) => item.id === E2E_PARTNER.link.id),
        ).toBe(true);
      });

      test("get top links for partner (filtered by domain and key)", async () => {
        const { status, data } = await http.get<any>({
          path: `/partner-profile/programs/${E2E_PROGRAM.id}/analytics`,
          query: {
            groupBy: "top_links",
            domain: E2E_PARTNER.link.domain,
            key: E2E_PARTNER.link.key,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_links.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        expect(
          parsed.data?.every((item) => item.partnerId === E2E_PARTNER.id),
        ).toBe(true);
        expect(
          parsed.data?.every((item) => item.id === E2E_PARTNER.link.id),
        ).toBe(true);
      });

      test("get top links for partner (negative filter by linkId)", async () => {
        const { status, data } = await http.get<any>({
          path: `/partner-profile/programs/${E2E_PROGRAM.id}/analytics`,
          query: {
            groupBy: "top_links",
            linkId: `-${E2E_PARTNER.link.id}`,
          },
        });

        expect(status).toEqual(200);
        const parsed = z
          .array(analyticsResponse.top_links.strict())
          .safeParse(data);
        expect(parsed.success).toBeTruthy();
        // need to make sure all returned links still belong to the partner
        expect(
          parsed.data?.every((item) => item.partnerId === E2E_PARTNER.id),
        ).toBe(true);
      });
    },
  );

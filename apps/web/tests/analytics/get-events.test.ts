import { clickEventResponseSchema } from "@/lib/zod/schemas/clicks";
import { CustomerSchema } from "@/lib/zod/schemas/customers";
import { leadEventResponseSchema as leadEventResponseSchemaRaw } from "@/lib/zod/schemas/leads";
import { saleEventResponseSchema as saleEventResponseSchemaRaw } from "@/lib/zod/schemas/sales";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER, E2E_PARTNERS, E2E_PROGRAM } from "../utils/resource";

const customerSchemaExtended = CustomerSchema.extend({
  createdAt: z.string().transform((str) => new Date(str)), // because the date is in UTC string in JSON
});

const leadEventResponseSchema = leadEventResponseSchemaRaw.extend({
  customer: customerSchemaExtended,
});

const saleEventResponseSchema = saleEventResponseSchemaRaw.extend({
  customer: customerSchemaExtended,
});

describe.runIf(env.CI).sequential("GET /events", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const workspaceId = workspace.id;

  test("get click events", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/events",
      query: {
        event: "clicks",
        workspaceId,
        interval: "30d",
        domain: "dub.sh",
        key: "checkly-check",
      },
    });

    const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);

    expect(status).toEqual(200);
    expect(parsed.success).toBeTruthy();
  });

  test("get lead events", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/events",
      query: {
        event: "leads",
        workspaceId,
        interval: "30d",
      },
    });

    const parsed = z.array(leadEventResponseSchema.strict()).safeParse(data);

    expect(status).toEqual(200);
    expect(parsed.success).toBeTruthy();
  });

  test("get sale events", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/events",
      query: {
        event: "sales",
        workspaceId,
        interval: "30d",
      },
    });

    const parsed = z.array(saleEventResponseSchema.strict()).safeParse(data);

    expect(status).toEqual(200);
    expect(parsed.success).toBeTruthy();
  });

  describe("Advanced Filters", () => {
    test("filter events by country", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "clicks",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
        },
      });

      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);

      expect(status).toEqual(200);
      expect(parsed.success).toBeTruthy();
      // expect all events to have country US
      data.forEach((event) => {
        expect(event.click.country).toBe("US");
      });
    });

    test("filter events by multiple countries (IS ONE OF)", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
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
      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      // expect all events to have country US, CA, or GB
      parsed.data?.forEach((event) => {
        expect(["US", "CA", "GB"]).toContain(event.click.country);
      });
    });

    test("exclude country (IS NOT)", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
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
      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      // expect all events to not have country US
      parsed.data?.forEach((event) => {
        expect(event.click.country).not.toBe("US");
      });
    });

    test("filter events by metadata query", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "sales",
          workspaceId,
          interval: "30d",
          query: "metadata['productId']:premiumProductId",
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(saleEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      // expect all events to have metadata.productId equal to premiumProductId
      parsed.data?.forEach((event) => {
        expect(event.metadata?.productId).toBe("premiumProductId");
      });
    });

    test("filter events by single partnerId", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "leads",
          workspaceId,
          interval: "all",
          partnerId: E2E_PARTNER.id,
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(leadEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      parsed.data?.forEach((event) => {
        // expect all events to have partnerId equal to E2E_PARTNER.id
        expect(event.link.partnerId).toBe(E2E_PARTNER.id);
        // also expect the programId to be the same as the E2E_PROGRAM.id
        expect(event.link.programId).toBe(E2E_PROGRAM.id);
      });
    });

    test("filter events by multiple partnerIds (IS ONE OF)", async () => {
      const partnerIds = E2E_PARTNERS.map((p) => p.id);
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "leads",
          workspaceId,
          interval: "all",
          partnerId: partnerIds.join(","),
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(leadEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      // expect all events to have partnerId equal to E2E_PARTNER.id
      parsed.data?.forEach((event) => {
        expect(partnerIds).toContain(event.link.partnerId);
      });
    });

    test("exclude events by partnerId (IS NOT)", async () => {
      const partnerIds = E2E_PARTNERS.map((p) => p.id);
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "clicks",
          workspaceId,
          interval: "all",
          partnerId: `-${partnerIds.join(",")}`,
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      parsed.data?.forEach((event) => {
        expect(partnerIds).not.toContain(event.link.partnerId);
      });
    });

    test("filter events by partnerId combined with country", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "clicks",
          workspaceId,
          interval: "all",
          partnerId: E2E_PARTNER.id,
          country: "US",
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      parsed.data?.forEach((event) => {
        expect(event.click.country).toBe("US");
        expect(event.link.partnerId).toBe(E2E_PARTNER.id);
      });
    });

    test("filter events by single tenantId", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "clicks",
          workspaceId,
          interval: "all",
          tenantId: E2E_PARTNER.tenantId,
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      parsed.data?.forEach((event) => {
        expect(event.link.tenantId).toBe(E2E_PARTNER.tenantId);
      });
    });

    test("exclude events by tenantId (IS NOT)", async () => {
      const { status, data } = await http.get<any[]>({
        path: "/events",
        query: {
          event: "clicks",
          workspaceId,
          interval: "all",
          tenantId: `-${E2E_PARTNER.tenantId}`,
        },
      });

      expect(status).toEqual(200);
      const parsed = z.array(clickEventResponseSchema.strict()).safeParse(data);
      expect(parsed.success).toBeTruthy();
      parsed.data?.forEach((event) => {
        expect(event.link.tenantId).not.toBe(E2E_PARTNER.tenantId);
      });
    });
  });
});

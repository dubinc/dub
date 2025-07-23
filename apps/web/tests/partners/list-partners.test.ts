import { EnrolledPartnerProps } from "@/lib/types";
import z from "@/lib/zod";
import {
  EnrolledPartnerBasicSchema as EnrolledPartnerBasicSchemaDate,
  EnrolledPartnerSchema as EnrolledPartnerSchemaDate,
} from "@/lib/zod/schemas/partners";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER, E2E_PROGRAM } from "../utils/resource";

// type coercion for date fields
const EnrolledPartnerBasicSchema = EnrolledPartnerBasicSchemaDate.extend({
  payoutsEnabledAt: z.string().nullable(),
  createdAt: z.string(),
});
const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.extend({
  payoutsEnabledAt: z.string().nullable(),
  createdAt: z.string(),
});

describe.sequential("GET /partners", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("returns list of partners with basic fields", async () => {
    const { data, status } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      // Validate each partner against the basic schema
      data.forEach((partner) => {
        const parsed = EnrolledPartnerBasicSchema.parse(partner);
        expect(parsed.programId).toBe(E2E_PROGRAM.id);
      });
    }
  });

  test("returns list of partners with expanded fields", async () => {
    const { data, status } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: {
        includeExpandedFields: "true",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      // Validate each partner against the expanded schema
      data.forEach((partner) => {
        const parsed = EnrolledPartnerSchema.parse(partner);
        expect(parsed.programId).toBe(E2E_PROGRAM.id);
      });
    }
  });

  test("filters partners by status", async () => {
    const { data, status } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: {
        status: "approved",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    // All partners should have approved status
    data.forEach((partner) => {
      const parsed = EnrolledPartnerBasicSchema.parse(partner);
      expect(parsed.status).toBe("approved");
    });
  });

  test("filters partners by country", async () => {
    const { data, status } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: {
        country: "US",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    // All partners should be from US
    data.forEach((partner) => {
      const parsed = EnrolledPartnerBasicSchema.parse(partner);
      expect(parsed.country).toBe("US");
    });
  });

  test("filters partners by tenantId", async () => {
    const { data, status } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: {
        tenantId: E2E_PARTNER.tenantId,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    // All partners should have the specified tenantId
    data.forEach((partner) => {
      const parsed = EnrolledPartnerBasicSchema.parse(partner);
      expect(parsed.tenantId).toBe(E2E_PARTNER.tenantId);
    });
  });
});

import { EnrolledPartnerProps } from "@/lib/types";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER } from "../utils/resource";
import { normalizedPartnerDateFields } from "./resource";

// type coercion for date fields
const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.extend(
  normalizedPartnerDateFields.shape,
);

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
      data.forEach((partner) => EnrolledPartnerSchema.parse(partner));
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
      data.forEach((partner) => EnrolledPartnerSchema.parse(partner));
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
      const parsed = EnrolledPartnerSchema.parse(partner);
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
      const parsed = EnrolledPartnerSchema.parse(partner);
      expect(parsed.country).toBe("US");
    });
  });

  test("filters partners by email", async () => {
    const { data, status } = await http.get<EnrolledPartnerProps[]>({
      path: "/partners",
      query: {
        email: E2E_PARTNER.email,
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    // All partners should have the specified email
    data.forEach((partner) => {
      const parsed = EnrolledPartnerSchema.parse(partner);
      expect(parsed.email).toBe(E2E_PARTNER.email);
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
      const parsed = EnrolledPartnerSchema.parse(partner);
      expect(parsed.tenantId).toBe(E2E_PARTNER.tenantId);
    });
  });
});

import { PartnerApplicationProps } from "@/lib/types";
import { PartnerApplicationSchema } from "@/lib/zod/schemas/program-application";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../../utils/integration";
import { E2E_PARTNER_GROUP, E2E_PARTNERS } from "../../utils/resource";

describe.sequential("GET /partners/applications", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("returns a list of pending partner applications", async () => {
    const { data, status } = await http.get<PartnerApplicationProps[]>({
      path: "/partners/applications",
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    data.forEach((application) => {
      const parsed = PartnerApplicationSchema.parse(application);
      expect(parsed.partner.status).toBe("pending");
    });
  });

  test("filters applications by country", async () => {
    const country = E2E_PARTNERS[0]!.country;

    const { data, status } = await http.get<PartnerApplicationProps[]>({
      path: "/partners/applications",
      query: { country },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    data.forEach((application) => {
      const parsed = PartnerApplicationSchema.parse(application);
      expect(parsed.partner.country).toBe(country);
      expect(parsed.partner.status).toBe("pending");
    });
  });

  test("filters applications by groupId", async () => {
    const { data, status } = await http.get<PartnerApplicationProps[]>({
      path: "/partners/applications",
      query: { groupId: E2E_PARTNER_GROUP.id },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    data.forEach((application) => {
      const parsed = PartnerApplicationSchema.parse(application);
      expect(parsed.partner.groupId).toBe(E2E_PARTNER_GROUP.id);
      expect(parsed.partner.status).toBe("pending");
    });
  });

  test("respects pageSize pagination", async () => {
    const { data, status } = await http.get<PartnerApplicationProps[]>({
      path: "/partners/applications",
      query: { page: "1", pageSize: "1" },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(1);

    data.forEach((application) => {
      PartnerApplicationSchema.parse(application);
    });
  });
});

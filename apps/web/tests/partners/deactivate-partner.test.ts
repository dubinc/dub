import { generateRandomName } from "@/lib/names";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { describe, expect, test } from "vitest";
import { fetchPartner } from "../utils/fetch-partner";
import { randomEmail, randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_GROUP } from "../utils/resource";
import { normalizedPartnerDateFields } from "./resource";

const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.extend(
  normalizedPartnerDateFields.shape,
);

describe.concurrent("POST /partners/deactivate", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("deactivate partner by partnerId", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data: createdData, status: createStatus } = await http.post({
      path: "/partners",
      body: partner,
    });

    expect(createStatus).toEqual(201);
    const createdPartner = EnrolledPartnerSchema.parse(createdData);

    const { data: deactivateData, status: deactivateStatus } = await http.post<{
      partnerId: string;
    }>({
      path: "/partners/deactivate",
      body: {
        partnerId: createdPartner.id,
      },
    });

    expect(deactivateStatus).toEqual(200);
    expect(deactivateData.partnerId).toBe(createdPartner.id);

    // Verify the partner is deactivated
    const fetchedPartner = await fetchPartner({
      http,
      partnerId: createdPartner.id,
    });
    expect(fetchedPartner.status).toBe("deactivated");
  });

  test("deactivate partner by tenantId", async () => {
    const tenantId = randomId();

    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      tenantId,
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data: createdData, status: createStatus } = await http.post({
      path: "/partners",
      body: partner,
    });

    expect(createStatus).toEqual(201);
    const createdPartner = EnrolledPartnerSchema.parse(createdData);
    expect(createdPartner.tenantId).toBe(tenantId);

    const { data: deactivateData, status: deactivateStatus } = await http.post<{
      partnerId: string;
    }>({
      path: "/partners/deactivate",
      body: {
        tenantId,
      },
    });

    expect(deactivateStatus).toEqual(200);
    expect(deactivateData.partnerId).toBe(createdPartner.id);

    // Verify the partner is deactivated
    const fetchedPartner = await fetchPartner({
      http,
      partnerId: createdPartner.id,
    });
    expect(fetchedPartner.status).toBe("deactivated");
  });
});

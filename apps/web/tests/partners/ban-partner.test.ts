import { generateRandomName } from "@/lib/names";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { Partner } from "@dub/prisma/client";
import { describe, expect, test } from "vitest";
import { randomEmail, randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_GROUP } from "../utils/resource";
import { normalizedPartnerDateFields } from "./resource";

const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.merge(
  normalizedPartnerDateFields,
);

describe.sequential("POST /partners/ban", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("ban partner by partnerId", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data: createdData, status: createStatus } =
      await http.post<Partner>({
        path: "/partners",
        body: partner,
      });

    expect(createStatus).toEqual(201);
    const createdPartner = EnrolledPartnerSchema.parse(createdData);

    const { data: banData, status: banStatus } = await http.post<{
      partnerId: string;
    }>({
      path: "/partners/ban",
      body: {
        partnerId: createdPartner.id,
        reason: "fraud",
      },
    });

    expect(banStatus).toEqual(200);
    expect(banData.partnerId).toBe(createdPartner.id);
  });

  test("ban partner by tenantId", async () => {
    const tenantId = randomId();

    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      tenantId,
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data: createdData, status: createStatus } =
      await http.post<Partner>({
        path: "/partners",
        body: partner,
      });

    expect(createStatus).toEqual(201);
    const createdPartner = EnrolledPartnerSchema.parse(createdData);
    expect(createdPartner.tenantId).toBe(tenantId);

    const { data: banData, status: banStatus } = await http.post<{
      partnerId: string;
    }>({
      path: "/partners/ban",
      body: {
        tenantId,
        reason: "fraud",
      },
    });

    expect(banStatus).toEqual(200);
    expect(banData.partnerId).toBe(createdPartner.id);
  });
});

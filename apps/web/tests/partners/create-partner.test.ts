import { generateRandomName } from "@/lib/names";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { Link, Partner } from "@dub/prisma/client";
import { R2_URL } from "@dub/utils";
import { describe, expect, test } from "vitest";
import { randomEmail, randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_GROUP, E2E_PROGRAM } from "../utils/resource";
import { normalizedPartnerDateFields } from "./resource";

const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.merge(
  normalizedPartnerDateFields,
);

describe.sequential("POST /partners", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("with required fields only", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: partner,
    });

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.name).toBe(partner.name);
    expect(parsed.email).toBe(partner.email);
  });

  test("with all fields", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      tenantId: randomId(),
      groupId: E2E_PARTNER_GROUP.id,
      description: "A description of the partner",
      country: "US",
    };

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: {
        ...partner,
        image: `https://api.dicebear.com/9.x/micah/png?seed=${partner.tenantId}`,
      },
    });

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.name).toBe(partner.name);
    expect(parsed.email).toBe(partner.email);
    expect(parsed.tenantId).toBe(partner.tenantId);
    expect(parsed.description).toBe(partner.description);
    expect(parsed.country).toBe(partner.country);

    // wait 2.5s, and then request the partners/[partnerId] endpoint
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const { data: partnerData } = await http.get<Partner>({
      path: `/partners/${data.id}`,
    });

    // make sure the image is successfully stored in R2
    expect(partnerData.image).toMatch(
      new RegExp(`^${R2_URL}/partners/${data.id}/image_.*`),
    );
  });

  test("with link props", async () => {
    const username = randomId();

    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: {
        username,
        ...partner,
      },
    });

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.name).toBe(partner.name);
    expect(parsed.email).toBe(partner.email);
    expect(parsed.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: E2E_PROGRAM.domain,
          url: E2E_PARTNER_GROUP.url,
          key: username,
          shortLink: `https://${E2E_PROGRAM.domain}/${username}`,
          clicks: 0,
          leads: 0,
          sales: 0,
          saleAmount: 0,
        }),
      ]),
    );
  });
});

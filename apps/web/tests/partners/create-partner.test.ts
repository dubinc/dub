import { generateRandomName } from "@/lib/names";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { Link, Partner } from "@dub/prisma/client";
import { R2_URL } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { describe, expect, test } from "vitest";
import { randomId, randomPartnerEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_GROUP, E2E_PROGRAM } from "../utils/resource";
import { normalizedPartnerDateFields } from "./resource";

function reEscape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.extend(
  normalizedPartnerDateFields.shape,
);

describe.sequential("POST /partners", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("with required fields only", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomPartnerEmail(),
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
      email: randomPartnerEmail(),
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
      email: randomPartnerEmail(),
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
    const keyRe = new RegExp(`^${reEscape(username)}(-[a-z0-9]{4})?$`);
    expect(parsed.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: E2E_PROGRAM.domain,
          url: expect.stringMatching(/^https?:\/\//),
          key: expect.stringMatching(keyRe),
          shortLink: expect.stringMatching(
            new RegExp(
              `^https://${reEscape(E2E_PROGRAM.domain)}/${reEscape(username)}(-[a-z0-9]{4})?$`,
            ),
          ),
          clicks: 0,
          leads: 0,
          sales: 0,
          saleAmount: 0,
        }),
      ]),
    );
  });

  test("with linkProps.prefix on default link", async () => {
    const id = randomId();
    const email = `prefix-e2e-${id}@example.com`;
    const identitySlug = slugify(email.split("@")[0]);
    const prefixedKeyRe = new RegExp(
      `^c/${reEscape(identitySlug)}(-[a-z0-9]{4})?$`,
    );

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: {
        email,
        groupId: E2E_PARTNER_GROUP.id,
        linkProps: { prefix: "/c/" },
      },
    });

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.links?.length).toBeGreaterThanOrEqual(1);
    for (const link of parsed.links!) {
      expect(link.key).toMatch(prefixedKeyRe);
      expect(link.shortLink).toBe(`https://${link.domain}/${link.key}`);
    }
  });

  test("upsert behavior - update existing partner with tenantId", async () => {
    const email = randomPartnerEmail();

    // First, create a partner with email and no tenantId
    const initialPartner = {
      email,
      name: generateRandomName(),
      groupId: E2E_PARTNER_GROUP.id,
    };

    const { data: firstData, status: firstStatus } = await http.post<Partner>({
      path: "/partners",
      body: initialPartner,
    });

    expect(firstStatus).toEqual(201);

    const firstParsed = EnrolledPartnerSchema.parse(firstData);
    expect(firstParsed.name).toBe(initialPartner.name);
    expect(firstParsed.email).toBe(initialPartner.email);
    expect(firstParsed.tenantId).toBeNull();

    // Then, create the same partner with the same email but with a tenantId
    const updatedPartner = {
      email,
      tenantId: randomId(),
    };

    const { data: secondData, status: secondStatus } = await http.post<Partner>(
      {
        path: "/partners",
        body: updatedPartner,
      },
    );

    expect(secondStatus).toEqual(201);
    const secondParsed = EnrolledPartnerSchema.parse(secondData);

    // Should be the same partner (same ID) but with updated fields
    expect(secondParsed.id).toBe(firstParsed.id);
    expect(secondParsed.email).toBe(email);
    expect(secondParsed.tenantId).toBe(updatedPartner.tenantId);
  });
});

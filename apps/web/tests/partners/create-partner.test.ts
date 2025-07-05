import { generateRandomName } from "@/lib/names";
import { Link, Partner } from "@dub/prisma/client";
import { R2_URL } from "@dub/utils";
import { describe, expect, test } from "vitest";
import { randomEmail, randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PROGRAM } from "../utils/resource";

const expectedPartner = {
  programId: E2E_PROGRAM.id,
  id: expect.stringMatching(/^pn_/),
  name: expect.any(String),
  email: expect.any(String),
  image: null,
  description: null,
  country: null,
  paypalEmail: null,
  stripeConnectId: null,
  payoutsEnabledAt: null,
  createdAt: expect.any(String),
  status: "approved",
  tenantId: null,
  clicks: 0,
  leads: 0,
  sales: 0,
  saleAmount: 0,
  earnings: 0,
  totalCommissions: 0,
  netRevenue: 0,
  website: null,
  youtube: null,
  twitter: null,
  linkedin: null,
  instagram: null,
  tiktok: null,
  links: expect.arrayContaining([
    expect.objectContaining({
      id: expect.stringMatching(/^link_/),
    }),
  ]),
};

describe.sequential("POST /partners", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("with required fields only", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
    };

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: {
        programId: E2E_PROGRAM.id,
        ...partner,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedPartner,
      ...partner,
    });
  });

  test("with all fields", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomEmail(),
      tenantId: randomId(),
      description: "A description of the partner",
      country: "US",
    };

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: {
        programId: E2E_PROGRAM.id,
        ...partner,
        image: `https://api.dicebear.com/9.x/micah/png?seed=${partner.tenantId}`,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedPartner,
      ...partner,
    });

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
    };

    const { data, status } = await http.post<Link>({
      path: "/partners",
      body: {
        programId: E2E_PROGRAM.id,
        username,
        ...partner,
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedPartner,
      ...partner,
      links: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          domain: E2E_PROGRAM.domain,
          url: E2E_PROGRAM.url,
          key: username,
          shortLink: `https://${E2E_PROGRAM.domain}/${username}`,
          clicks: 0,
          leads: 0,
          sales: 0,
          saleAmount: 0,
        }),
      ]),
    });
  });
});

import { generateRandomName } from "@/lib/names";
import { Link } from "@dub/prisma/client";
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
  payoutsEnabledAt: null,
  createdAt: expect.any(String),
  status: "approved",
  tenantId: null,
  clicks: 0,
  leads: 0,
  sales: 0,
  saleAmount: 0,
  earnings: 0,
  applicationId: null,
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
      },
    });

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedPartner,
      ...partner,
    });
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

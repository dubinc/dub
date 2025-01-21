import { Domain } from "@dub/prisma/client";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

const slug = `${randomId()}.dub-internal-test.com`;

const domainRecord = {
  slug: slug,
  expiredUrl: `https://${slug}/expired`,
  placeholder: `https://${slug}/placeholder`,
  notFoundUrl: `https://${slug}/not-found`,
};

const expectedDomain = {
  id: expect.any(String),
  slug: domainRecord.slug,
  verified: expect.any(Boolean),
  primary: expect.any(Boolean),
  archived: false,
  placeholder: domainRecord.placeholder,
  expiredUrl: domainRecord.expiredUrl,
  notFoundUrl: domainRecord.notFoundUrl,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  registeredDomain: null,
  logo: null,
};

describe.sequential("/domains/**", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();

  test("POST /domains", async () => {
    const { status, data: domain } = await http.post<Domain>({
      path: "/domains",
      query: { workspaceId: workspace.id },
      body: domainRecord,
    });

    expect(status).toEqual(201);
    expect(domain).toStrictEqual(expectedDomain);
  });

  test("GET /domains/{slug}", async () => {
    const { status, data: domain } = await http.get<Domain>({
      path: `/domains/${domainRecord.slug}`,
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(domain).toStrictEqual(expectedDomain);
  });

  test("GET /domains", async () => {
    const { status, data: domains } = await http.get<Domain[]>({
      path: "/domains",
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(
      domains.map((d) => ({ ...d, registeredDomain: null })),
    ).toContainEqual(expectedDomain);
  });

  test("POST /domains/{slug}/primary", { retry: 3 }, async () => {
    const { status, data: domain } = await http.post<Domain>({
      path: `/domains/${domainRecord.slug}/primary`,
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(domain).toStrictEqual({
      ...expectedDomain,
      primary: true,
    });
  });

  test("PATCH /domains/{slug}", { retry: 3 }, async () => {
    const toUpdate = {
      expiredUrl: `https://${slug}/expired-new`,
      placeholder: `https://${slug}/placeholder-new`,
      notFoundUrl: `https://${slug}/not-found-new`,
      archived: true,
    };

    onTestFinished(async () => {
      await h.deleteDomain(domainRecord.slug);
    });

    const { status, data: domain } = await http.patch<Domain>({
      path: `/domains/${domainRecord.slug}`,
      query: { workspaceId: workspace.id },
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(domain).toStrictEqual({
      ...expectedDomain,
      ...toUpdate,
    });
  });
});

import type { DomainProps } from "@/lib/types";
import { expect } from "@playwright/test";
import { randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";

test.describe.configure({
  mode: "serial",
});

const VALID_ASSET_LINKS = JSON.stringify([
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.example.app",
      sha256_cert_fingerprints: ["AA:BB:CC"],
    },
  },
]);

const VALID_AASA = JSON.stringify({
  applinks: {
    apps: [],
    details: [{ appID: "TEAMID.com.example.app", paths: ["*"] }],
  },
});

const VALID_DEEPVIEW = JSON.stringify({
  title: "Welcome",
  description: "Hi",
});

const UPDATED_ASSET_LINKS = JSON.stringify([
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.example.app.updated",
      sha256_cert_fingerprints: ["DD:EE:FF"],
    },
  },
]);

const UPDATED_AASA = JSON.stringify({
  applinks: {
    apps: [],
    details: [{ appID: "TEAMID.com.example.updated", paths: ["/app/*"] }],
  },
});

const UPDATED_DEEPVIEW = JSON.stringify({
  title: "Updated",
  description: "New copy",
});

const INVALID_JSON = "not-json";

type JsonConfigFields = {
  assetLinks?: string | null;
  appleAppSiteAssociation?: string | null;
  deepviewData?: string | null;
};

type DomainCreateBody = ReturnType<typeof domainBody> & JsonConfigFields;

const jsonFields = [
  {
    field: "assetLinks" as const,
    label: "Asset Links",
    valid: VALID_ASSET_LINKS,
    updated: UPDATED_ASSET_LINKS,
    emptyCreateExpected: null,
  },
  {
    field: "appleAppSiteAssociation" as const,
    label: "Apple App Site Association",
    valid: VALID_AASA,
    updated: UPDATED_AASA,
    emptyCreateExpected: null,
  },
  {
    field: "deepviewData" as const,
    label: "Deep View data",
    valid: VALID_DEEPVIEW,
    updated: UPDATED_DEEPVIEW,
    emptyCreateExpected: null,
  },
];

function randomDomainSlug() {
  return `${randomName("domain").toLowerCase()}.dub-internal-test.com`;
}

function domainBody(slug: string) {
  return {
    slug,
    expiredUrl: `https://${slug}/expired`,
    placeholder: `https://${slug}/placeholder`,
    notFoundUrl: `https://${slug}/not-found`,
  };
}

function expectedDomain(body: DomainCreateBody) {
  return {
    id: expect.any(String),
    slug: body.slug,
    verified: expect.any(Boolean),
    primary: expect.any(Boolean),
    archived: false,
    placeholder: body.placeholder,
    expiredUrl: body.expiredUrl,
    notFoundUrl: body.notFoundUrl,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    registeredDomain: null,
    logo: null,
    appleAppSiteAssociation: body.appleAppSiteAssociation
      ? JSON.parse(body.appleAppSiteAssociation)
      : null,
    assetLinks: body.assetLinks ? JSON.parse(body.assetLinks) : null,
    deepviewData: body.deepviewData ? JSON.parse(body.deepviewData) : {},
  };
}

function domainJsonForCompare(domain: DomainProps) {
  return {
    ...domain,
    assetLinks: domain.assetLinks ? JSON.parse(domain.assetLinks) : null,
    appleAppSiteAssociation: domain.appleAppSiteAssociation
      ? JSON.parse(domain.appleAppSiteAssociation)
      : null,
    deepviewData: domain.deepviewData ? JSON.parse(domain.deepviewData) : null,
  };
}

function expectDomainEqual(actual: DomainProps, expected: DomainCreateBody) {
  expect(domainJsonForCompare(actual)).toStrictEqual(expectedDomain(expected));
}

function expectJsonFieldEqual(
  actual: string | null | undefined,
  expected: string | null,
) {
  if (expected === null) {
    expect(actual ?? null).toBeNull();
    return;
  }

  expect(actual).toEqual(expect.any(String));
  expect(JSON.parse(actual!)).toEqual(JSON.parse(expected));
}

async function createDomain(
  api: ApiClient,
  overrides: Partial<DomainCreateBody> = {},
) {
  const slug = overrides.slug ?? randomDomainSlug();
  const body = { ...domainBody(slug), ...overrides };
  const response = await api.post<DomainProps>("/api/domains", body);

  expect(response.status).toEqual(201);
  return { ...response, body };
}

async function deleteDomain(api: ApiClient, slug: string | undefined) {
  if (!slug) return;
  await api.delete(`/api/domains/${slug}`);
}

test("POST /domains", async ({ api }) => {
  let slug: string | undefined;

  try {
    const { status, data, body } = await createDomain(api);
    slug = data.slug;

    expect(status).toEqual(201);
    expectDomainEqual(data, body);
  } finally {
    await deleteDomain(api, slug);
  }
});

test("GET /domains/{slug}", async ({ api }) => {
  let slug: string | undefined;

  try {
    const { data: created } = await createDomain(api);
    slug = created.slug;

    const { status, data } = await api.get<DomainProps>(`/api/domains/${slug}`);

    expect(status).toEqual(200);
    expect(data).toStrictEqual(created);
  } finally {
    await deleteDomain(api, slug);
  }
});

test("GET /domains", async ({ api }) => {
  let slug: string | undefined;

  try {
    const { data: created } = await createDomain(api);
    slug = created.slug;

    const { status, data } = await api.get<DomainProps[]>("/api/domains");

    expect(status).toEqual(200);
    expect(data).toEqual(expect.arrayContaining([created]));
  } finally {
    await deleteDomain(api, slug);
  }
});

test("POST /domains/{slug}/primary", async ({ api }) => {
  let slug: string | undefined;

  try {
    const { data: created } = await createDomain(api);
    slug = created.slug;

    const { status, data } = await api.post<DomainProps>(
      `/api/domains/${slug}/primary`,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...created,
      primary: true,
      updatedAt: expect.any(String),
    });
  } finally {
    await deleteDomain(api, slug);
  }
});

test("PATCH /domains/{slug}", async ({ api }) => {
  let slug: string | undefined;

  try {
    const { data: created } = await createDomain(api);
    slug = created.slug;

    const toUpdate = {
      expiredUrl: `https://${slug}/expired-new`,
      placeholder: `https://${slug}/placeholder-new`,
      notFoundUrl: `https://${slug}/not-found-new`,
      archived: true,
    };

    const { status, data } = await api.patch<DomainProps>(
      `/api/domains/${slug}`,
      toUpdate,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...created,
      ...toUpdate,
      updatedAt: expect.any(String),
    });
  } finally {
    await deleteDomain(api, slug);
  }
});

test("DELETE /domains/{slug}", async ({ api }) => {
  const { data: created } = await createDomain(api);

  const { status, data } = await api.delete<{ slug: string }>(
    `/api/domains/${created.slug}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({ slug: created.slug });

  const { status: listStatus, data: domains } =
    await api.get<DomainProps[]>("/api/domains");

  expect(listStatus).toEqual(200);
  expect(domains.find((d) => d.slug === created.slug)).toBeUndefined();
});

test("GET /domains/status – not eligible", async ({ api }) => {
  const { status, data } = await api.get(
    "/api/domains/status?domains=example.link",
  );

  expect(status).toEqual(403);
  expect(data).toEqual({
    error: {
      code: "forbidden",
      message:
        "GET /domains/status is not available for your workspace. Contact support for more information.",
      doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
    },
  });
});

const errorCases = [
  {
    name: "POST /domains – without slug",
    body: {},
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "invalid_type: slug: slug is required",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
  {
    name: "POST /domains – invalid domain",
    body: { slug: "not a domain" },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "Invalid domain",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
];

for (const { name, body, expected } of errorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/domains", body)).toEqual(expected);
  });
}

test("POST /domains – existing slug", async ({ api }) => {
  let slug: string | undefined;

  try {
    const { data: created } = await createDomain(api);
    slug = created.slug;

    const { status, data } = await api.post("/api/domains", {
      slug,
    });

    expect(status).toEqual(409);
    expect(data).toEqual({
      error: {
        code: "conflict",
        message: "Domain is already in use.",
        doc_url: "https://dub.co/docs/api-reference/errors#conflict",
      },
    });
  } finally {
    await deleteDomain(api, slug);
  }
});

test("GET /domains/{slug} – not found", async ({ api }) => {
  const slug = randomDomainSlug();

  const { status, data } = await api.get(`/api/domains/${slug}`);

  expect(status).toEqual(404);
  expect(data).toEqual({
    error: {
      code: "not_found",
      message: `Domain ${slug} not found.`,
      doc_url: "https://dub.co/docs/api-reference/errors#not-found",
    },
  });
});

test.describe("JSON config fields", () => {
  for (const {
    field,
    label,
    valid,
    updated,
    emptyCreateExpected,
  } of jsonFields) {
    test(`POST /domains – valid ${field}`, async ({ api }) => {
      let slug: string | undefined;

      try {
        const { status, data, body } = await createDomain(api, {
          [field]: valid,
        });
        slug = data.slug;

        expect(status).toEqual(201);
        expectDomainEqual(data, body);
        expectJsonFieldEqual(data[field], valid);
      } finally {
        await deleteDomain(api, slug);
      }
    });

    test(`PATCH /domains/{slug} – update ${field}`, async ({ api }) => {
      let slug: string | undefined;

      try {
        const { data: created } = await createDomain(api);
        slug = created.slug;

        const { status, data } = await api.patch<DomainProps>(
          `/api/domains/${slug}`,
          { [field]: updated },
        );

        expect(status).toEqual(200);
        expectJsonFieldEqual(data[field], updated);
      } finally {
        await deleteDomain(api, slug);
      }
    });

    test(`POST /domains – empty ${field}`, async ({ api }) => {
      let slug: string | undefined;

      try {
        const { status, data } = await createDomain(api, {
          [field]: "",
        });
        slug = data.slug;

        expect(status).toEqual(201);
        expect(data[field]).toEqual(emptyCreateExpected);
      } finally {
        await deleteDomain(api, slug);
      }
    });

    test(`PATCH /domains/{slug} – clear ${field} with null`, async ({
      api,
    }) => {
      let slug: string | undefined;

      try {
        const { data: created } = await createDomain(api, {
          [field]: valid,
        });
        slug = created.slug;

        const { status, data } = await api.patch<DomainProps>(
          `/api/domains/${slug}`,
          { [field]: null },
        );

        expect(status).toEqual(200);
        expect(data[field]).toBeNull();
      } finally {
        await deleteDomain(api, slug);
      }
    });

    test(`PATCH /domains/{slug} – clear ${field} with empty string`, async ({
      api,
    }) => {
      let slug: string | undefined;

      try {
        const { data: created } = await createDomain(api, {
          [field]: valid,
        });
        slug = created.slug;

        const { status, data } = await api.patch<DomainProps>(
          `/api/domains/${slug}`,
          { [field]: "" },
        );

        expect(status).toEqual(200);
        expect(data[field]).toBeNull();
      } finally {
        await deleteDomain(api, slug);
      }
    });

    test(`POST /domains – invalid ${field} JSON`, async ({ api }) => {
      const slug = randomDomainSlug();

      expect(
        await api.post("/api/domains", {
          ...domainBody(slug),
          [field]: INVALID_JSON,
        }),
      ).toEqual({
        status: 422,
        data: {
          error: {
            code: "unprocessable_entity",
            message: `Invalid ${label}`,
            doc_url:
              "https://dub.co/docs/api-reference/errors#unprocessable-entity",
          },
        },
      });
    });

    test(`PATCH /domains/{slug} – invalid ${field} JSON`, async ({ api }) => {
      let slug: string | undefined;

      try {
        const { data: created } = await createDomain(api);
        slug = created.slug;

        expect(
          await api.patch(`/api/domains/${slug}`, {
            [field]: INVALID_JSON,
          }),
        ).toEqual({
          status: 422,
          data: {
            error: {
              code: "unprocessable_entity",
              message: `Invalid ${label}`,
              doc_url:
                "https://dub.co/docs/api-reference/errors#unprocessable-entity",
            },
          },
        });
      } finally {
        await deleteDomain(api, slug);
      }
    });
  }

  test("POST + PATCH – create, update, and clear all JSON fields", async ({
    api,
  }) => {
    let slug: string | undefined;

    try {
      const { data: created, body } = await createDomain(api, {
        assetLinks: VALID_ASSET_LINKS,
        appleAppSiteAssociation: VALID_AASA,
        deepviewData: VALID_DEEPVIEW,
      });
      slug = created.slug;

      expect(created).toEqual(expect.objectContaining({ slug: body.slug }));
      expectDomainEqual(created, body);

      const updatedPayload = {
        assetLinks: UPDATED_ASSET_LINKS,
        appleAppSiteAssociation: UPDATED_AASA,
        deepviewData: UPDATED_DEEPVIEW,
      };

      const { status: updateStatus, data: updated } =
        await api.patch<DomainProps>(`/api/domains/${slug}`, updatedPayload);

      expect(updateStatus).toEqual(200);
      expectJsonFieldEqual(updated.assetLinks, UPDATED_ASSET_LINKS);
      expectJsonFieldEqual(updated.appleAppSiteAssociation, UPDATED_AASA);
      expectJsonFieldEqual(updated.deepviewData, UPDATED_DEEPVIEW);

      const clearPayload = {
        assetLinks: null,
        appleAppSiteAssociation: null,
        deepviewData: null,
      };

      const { status: clearStatus, data: cleared } =
        await api.patch<DomainProps>(`/api/domains/${slug}`, clearPayload);

      expect(clearStatus).toEqual(200);
      expect(cleared.assetLinks).toBeNull();
      expect(cleared.appleAppSiteAssociation).toBeNull();
      expect(cleared.deepviewData).toBeNull();
    } finally {
      await deleteDomain(api, slug);
    }
  });
});

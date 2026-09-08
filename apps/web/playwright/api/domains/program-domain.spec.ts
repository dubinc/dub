import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { DomainProps } from "@/lib/types";
import { expect } from "@playwright/test";
import { apiError, randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

test.describe.configure({
  mode: "serial",
});

function randomDomainSlug() {
  return `${randomName("domain").toLowerCase()}.dub-internal-test.com`;
}

async function createDomain(api: ApiClient) {
  const slug = randomDomainSlug();
  const response = await api.post<DomainProps>("/api/domains", { slug });
  expect(response.status).toEqual(201);
  return response.data;
}

async function deleteDomain(api: ApiClient, slug: string | undefined) {
  if (!slug) return;
  await api.delete(`/api/domains/${slug}`);
}

async function restoreProgramDomain(api: ApiClient) {
  await api.post(`/api/domains/${TEST_WORKSPACE.program.domain}/program`);
}

test("POST /domains/{slug}/program", async ({ api, program }) => {
  let slug: string | undefined;
  let changed = false;

  try {
    const created = await createDomain(api);
    slug = created.slug;

    const { status, data } = await api.post<DomainProps>(
      `/api/domains/${slug}/program`,
    );
    changed = true;

    expect(status).toEqual(200);
    expect(data).toStrictEqual(created);

    const { status: programStatus, data: updatedProgram } = await api.get<{
      domain: string;
    }>(`/api/programs/${program.id}`);

    expect(programStatus).toEqual(200);
    expect(updatedProgram.domain).toEqual(slug);

    const { status: linksStatus, data: defaultLinks } = await api.get<
      { domain: string }[]
    >(`/api/groups/${program.defaultGroupId}/default-links`);

    expect(linksStatus).toEqual(200);
    expect(defaultLinks.length).toBeGreaterThan(0);
    expect(defaultLinks.every((link) => link.domain === slug)).toBe(true);
  } finally {
    if (changed) {
      await restoreProgramDomain(api);
    }
    await deleteDomain(api, slug);
  }
});

test("POST /domains/{slug}/program – already the program domain", async ({
  api,
}) => {
  expect(
    await api.post(`/api/domains/${TEST_WORKSPACE.program.domain}/program`),
  ).toEqual(
    apiError({
      code: "bad_request",
      message: "This domain is already the program domain.",
    }),
  );
});

test("POST /domains/{slug}/program – archived domain", async ({ api }) => {
  let slug: string | undefined;

  try {
    const created = await createDomain(api);
    slug = created.slug;

    const { status: archiveStatus } = await api.patch(`/api/domains/${slug}`, {
      archived: true,
    });
    expect(archiveStatus).toEqual(200);

    expect(await api.post(`/api/domains/${slug}/program`)).toEqual(
      apiError({
        code: "bad_request",
        message: "You cannot set an archived domain as the program domain.",
      }),
    );
  } finally {
    await deleteDomain(api, slug);
  }
});

test("POST /domains/{slug}/program – not found", async ({ api }) => {
  const slug = randomDomainSlug();

  expect(await api.post(`/api/domains/${slug}/program`)).toEqual(
    apiError({
      code: "not_found",
      message: `Domain ${slug} not found.`,
    }),
  );
});

test("POST /domains/{slug}/program – another workspace", async ({ api }) => {
  const slug = randomDomainSlug();

  await prisma.domain.create({
    data: {
      id: createId({ prefix: "dom_" }),
      slug,
    },
  });

  try {
    const { status, data } = await api.post(`/api/domains/${slug}/program`);

    expect(status).toEqual(403);
    expect(data).toEqual({
      error: {
        code: "forbidden",
        message: expect.stringContaining(
          `Domain ${slug} does not belong to workspace`,
        ),
        doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
      },
    });
  } finally {
    await prisma.domain.delete({
      where: { slug },
    });
  }
});

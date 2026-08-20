import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import slugify from "@sindresorhus/slugify";
import * as z from "zod/v4";
import { apiError, randomName, randomPartnerEmail } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

const EnrolledPartnerSchema = EnrolledPartnerSchemaDate.extend({
  createdAt: z.string(),
  bannedAt: z.string().nullish(),
  payoutsEnabledAt: z.string().nullish(),
  identityVerifiedAt: z.string().nullish(),
  trustedAt: z.string().nullish(),
});

function reEscape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createPartner(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<EnrolledPartnerProps>("/api/partners", {
    name: randomName(),
    email: randomPartnerEmail(),
    ...overrides,
  });
}

async function deletePartner(partnerId: string | undefined) {
  if (!partnerId) return;

  await prisma.link.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.programEnrollment.deleteMany({
    where: {
      partnerId,
    },
  });

  // Prisma partner.delete hits a PlanetScale relation quirk; raw SQL matches
  // bulkDeletePartners cleanup used by e2e cron.
  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
}

test("POST /partners", async ({ api, program }) => {
  let partnerId: string | undefined;

  try {
    const body = {
      name: randomName(),
      email: randomPartnerEmail(),
    };

    const { status, data } = await api.post<EnrolledPartnerProps>(
      "/api/partners",
      body,
    );
    partnerId = data.id;

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed).toMatchObject({
      id: expect.any(String),
      name: body.name,
      email: body.email,
      programId: program.id,
      status: "approved",
    });
    expect(parsed.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: TEST_WORKSPACE.program.domain,
          url: expect.stringMatching(
            new RegExp(`^${reEscape(TEST_WORKSPACE.program.url)}/?$`),
          ),
          shortLink: expect.stringMatching(
            new RegExp(`^https://${reEscape(TEST_WORKSPACE.program.domain)}/`),
          ),
          clicks: 0,
          leads: 0,
          sales: 0,
          saleAmount: 0,
        }),
      ]),
    );
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners – all fields", async ({ api, program }) => {
  let partnerId: string | undefined;
  const tenantId = nanoid();

  try {
    const body = {
      name: randomName(),
      email: randomPartnerEmail(),
      tenantId,
      groupId: program.defaultGroupId,
      description: "A description of the partner",
      country: "US",
    };

    const { status, data } = await api.post<EnrolledPartnerProps>(
      "/api/partners",
      {
        ...body,
        image: `https://api.dicebear.com/9.x/micah/png?seed=${tenantId}`,
      },
    );
    partnerId = data.id;

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed).toMatchObject({
      name: body.name,
      email: body.email,
      tenantId: body.tenantId,
      description: body.description,
      country: body.country,
      image: null,
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners – username", async ({ api }) => {
  let partnerId: string | undefined;
  const username = nanoid();

  try {
    const { status, data } = await createPartner(api, { username });
    partnerId = data.id;

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    const keyRe = new RegExp(`^${reEscape(username)}(-[a-z0-9]{4})?$`);
    expect(parsed.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: expect.stringMatching(keyRe),
          shortLink: expect.stringMatching(
            new RegExp(
              `^https://${reEscape(TEST_WORKSPACE.program.domain)}/${reEscape(username)}(-[a-z0-9]{4})?$`,
            ),
          ),
        }),
      ]),
    );
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners – invalid username", async ({ api }) => {
  expect(
    await api.post("/api/partners", {
      email: randomPartnerEmail(),
      username: "invalid username",
    }),
  ).toEqual(
    apiError({
      code: "unprocessable_entity",
      message:
        "custom: username: Invalid username. Must be a URL-friendly string.",
    }),
  );
});

test("POST /partners – linkProps.prefix on default link", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  const email = randomPartnerEmail();
  const identitySlug = slugify(email.split("@")[0]);
  const prefixedKeyRe = new RegExp(
    `^c/${reEscape(identitySlug)}(-[a-z0-9]{4})?$`,
  );

  try {
    const { status, data } = await api.post<EnrolledPartnerProps>(
      "/api/partners",
      {
        email,
        groupId: program.defaultGroupId,
        linkProps: { prefix: "/c/" },
      },
    );
    partnerId = data.id;

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.links?.length).toBeGreaterThanOrEqual(1);
    for (const link of parsed.links!) {
      expect(link.key).toMatch(prefixedKeyRe);
      expect(link.shortLink).toBe(`https://${link.domain}/${link.key}`);
    }
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners – upsert tenantId on existing partner", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;

  try {
    const email = randomPartnerEmail();
    const { status: firstStatus, data: firstData } = await createPartner(api, {
      email,
      groupId: program.defaultGroupId,
    });
    partnerId = firstData.id;

    expect(firstStatus).toEqual(201);
    const firstParsed = EnrolledPartnerSchema.parse(firstData);
    expect(firstParsed).toMatchObject({
      email,
      tenantId: null,
    });

    const tenantId = nanoid();
    const { status: secondStatus, data: secondData } = await createPartner(
      api,
      {
        email,
        tenantId,
      },
    );

    expect(secondStatus).toEqual(201);
    const secondParsed = EnrolledPartnerSchema.parse(secondData);
    expect(secondParsed).toMatchObject({
      id: firstParsed.id,
      email,
      tenantId,
    });
  } finally {
    await deletePartner(partnerId);
  }
});

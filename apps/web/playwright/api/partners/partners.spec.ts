import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { EnrolledPartnerSchema as EnrolledPartnerSchemaDate } from "@/lib/zod/schemas/partners";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import slugify from "@sindresorhus/slugify";
import * as z from "zod/v4";
import { apiError, randomName, randomPartnerEmail } from "../../utils";
import { createPartnerTag, deletePartnerTag } from "../campaigns/helpers";
import { test } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";
import { createPartner, deletePartner } from "./helpers";

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

test("POST /partners – invalid tagIds", async ({ api, program }) => {
  const email = randomPartnerEmail();
  const tagId = "ptag_invalid";

  const response = await api.post("/api/partners", {
    email,
    tagIds: [tagId],
  });

  expect(response).toEqual(
    apiError({
      code: "bad_request",
      message: `Invalid partner tag IDs detected: ${tagId}`,
    }),
  );

  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      programId: program.id,
      partner: {
        email,
      },
    },
  });

  expect(enrollment).toBeNull();
});

test("POST /partners – with tagIds", async ({ api, program }) => {
  let partnerId: string | undefined;
  let partnerTagId: string | undefined;

  try {
    const partnerTag = await createPartnerTag(program.id);
    partnerTagId = partnerTag.id;

    const { status, data } = await createPartner(api, {
      tagIds: [partnerTag.id, partnerTag.id],
    });
    partnerId = data.id;

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.tags).toEqual([
      {
        id: partnerTag.id,
        name: partnerTag.name,
      },
    ]);

    const tags = await prisma.programPartnerTag.findMany({
      where: {
        programId: program.id,
        partnerId,
      },
    });

    expect(tags).toEqual([
      expect.objectContaining({
        partnerTagId: partnerTag.id,
      }),
    ]);
  } finally {
    if (partnerId) {
      await prisma.programPartnerTag.deleteMany({
        where: { partnerId },
      });
    }
    await deletePartner(partnerId);
    await deletePartnerTag(partnerTagId);
  }
});

test("POST /partners – invalid tagNames", async ({ api, program }) => {
  const email = randomPartnerEmail();
  const tagName = "missing-partner-tag";

  const response = await api.post("/api/partners", {
    email,
    tagNames: [tagName],
  });

  expect(response).toEqual(
    apiError({
      code: "bad_request",
      message: `Invalid partner tag names detected: ${tagName}`,
    }),
  );

  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      programId: program.id,
      partner: {
        email,
      },
    },
  });

  expect(enrollment).toBeNull();
});

test("POST /partners – with tagNames", async ({ api, program }) => {
  let partnerId: string | undefined;
  let partnerTagId: string | undefined;

  try {
    const partnerTag = await createPartnerTag(program.id);
    partnerTagId = partnerTag.id;

    const { status, data } = await createPartner(api, {
      tagNames: [partnerTag.name, partnerTag.name],
    });
    partnerId = data.id;

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.tags).toEqual([
      {
        id: partnerTag.id,
        name: partnerTag.name,
      },
    ]);

    const tags = await prisma.programPartnerTag.findMany({
      where: {
        programId: program.id,
        partnerId,
      },
    });

    expect(tags).toEqual([
      expect.objectContaining({
        partnerTagId: partnerTag.id,
      }),
    ]);
  } finally {
    if (partnerId) {
      await prisma.programPartnerTag.deleteMany({
        where: { partnerId },
      });
    }
    await deletePartner(partnerId);
    await deletePartnerTag(partnerTagId);
  }
});

test("POST /partners – existing enrollment returns current tags", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  let assignedTagId: string | undefined;
  let otherTagId: string | undefined;

  try {
    const assignedTag = await createPartnerTag(program.id);
    const otherTag = await createPartnerTag(program.id);
    assignedTagId = assignedTag.id;
    otherTagId = otherTag.id;
    const email = randomPartnerEmail();

    const { status: firstStatus, data: firstData } = await createPartner(api, {
      email,
      tagNames: [assignedTag.name],
    });
    partnerId = firstData.id;

    expect(firstStatus).toEqual(201);

    const { status, data } = await createPartner(api, {
      email,
      tagNames: [otherTag.name],
    });

    expect(status).toEqual(201);
    const parsed = EnrolledPartnerSchema.parse(data);
    expect(parsed.id).toEqual(partnerId);
    expect(parsed.tags).toEqual([
      {
        id: assignedTag.id,
        name: assignedTag.name,
      },
    ]);
  } finally {
    if (partnerId) {
      await prisma.programPartnerTag.deleteMany({
        where: { partnerId },
      });
    }
    await deletePartner(partnerId);
    await deletePartnerTag(assignedTagId);
    await deletePartnerTag(otherTagId);
  }
});

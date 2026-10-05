import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { GroupProps, ProgramApplicationProps } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { ProgramApplicationStatus } from "@prisma/client";
import { apiError, randomPartnerEmail } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { createGroup, deleteGroup } from "../groups/helpers";
import { deletePartner } from "../partners/helpers";

type SeededApplication = {
  id: string;
  partnerId: string | null;
  name: string;
  email: string;
  country: "US" | "GB";
  groupId: string;
  status: ProgramApplicationStatus;
  createdAt: Date;
};

type CountByCountry = { country: string | null; _count: number }[];
type CountByGroupId = { groupId: string | null; _count: number }[];

type ErrorCase = {
  name: string;
  params: Record<string, string>;
  message: string;
};

const VERIFIED_WEBSITE = "https://verified.example.com";
const VERIFIED_AT = new Date("2026-01-01T00:00:00.000Z");

function listApplications(api: ApiClient, params: Record<string, string>) {
  return api.get<ProgramApplicationProps[]>(
    `/api/program-applications?${new URLSearchParams(params)}`,
  );
}

function countApplications<T = number>(
  api: ApiClient,
  params: Record<string, string>,
) {
  return api.get<T>(
    `/api/program-applications/count?${new URLSearchParams(params)}`,
  );
}

function ids(applications: { id: string }[]) {
  return applications.map(({ id }) => id);
}

test.describe("program applications", () => {
  // Shared Prisma seed for this describe; serial so beforeAll runs once.
  test.describe.configure({ mode: "serial" });

  const batch = nanoid(10);
  const foreignProgramId = createId({ prefix: "prog_" });

  let extraGroup: GroupProps;
  let defaultGroupId: string;
  let seeded: SeededApplication[] = [];

  // Named handles into `seeded` for readability in assertions.
  let pendingUsWithPlatforms: SeededApplication;
  let pendingGb: SeededApplication;
  let pendingUs: SeededApplication;
  let pendingDefaultGroup: SeededApplication;
  let rejectedUs: SeededApplication;
  let rejectedGb: SeededApplication;
  let approvedUs: SeededApplication;

  test.beforeAll(async ({ api, program }) => {
    defaultGroupId = program.defaultGroupId;
    extraGroup = await createGroup(api);

    const now = Date.now();

    const rows: (Pick<SeededApplication, "country" | "groupId" | "status"> & {
      programId?: string;
      withPartner?: boolean;
    })[] = [
      { country: "US", groupId: extraGroup.id, status: "pending" },
      { country: "GB", groupId: extraGroup.id, status: "pending" },
      { country: "US", groupId: extraGroup.id, status: "pending" },
      { country: "US", groupId: defaultGroupId, status: "pending" },
      { country: "US", groupId: extraGroup.id, status: "rejected" },
      { country: "GB", groupId: extraGroup.id, status: "rejected" },
      { country: "US", groupId: extraGroup.id, status: "approved" },
      // Never listed: orphaned (no partner), and another program's.
      {
        country: "US",
        groupId: extraGroup.id,
        status: "pending",
        withPartner: false,
      },
      {
        country: "US",
        groupId: extraGroup.id,
        status: "pending",
        programId: foreignProgramId,
      },
    ];

    for (const [i, row] of rows.entries()) {
      const partnerId =
        row.withPartner === false ? null : createId({ prefix: "pn_" });
      const name = `pw-app-${batch}-${i}`;
      const email = randomPartnerEmail();
      const createdAt = new Date(now - i * 1000);

      if (partnerId) {
        await prisma.partner.create({
          data: {
            id: partnerId,
            name,
            email,
            country: row.country,
          },
        });
      }

      const application: SeededApplication = {
        id: createId({ prefix: "pga_" }),
        partnerId,
        name,
        email,
        country: row.country,
        groupId: row.groupId,
        status: row.status,
        createdAt,
      };

      await prisma.programApplication.create({
        data: {
          id: application.id,
          programId: row.programId ?? program.id,
          partnerId,
          groupId: row.groupId,
          name,
          email,
          country: row.country,
          status: row.status,
          formData: { fields: [] },
          createdAt,
        },
      });

      seeded.push(application);
    }

    [
      pendingUsWithPlatforms,
      pendingGb,
      pendingUs,
      pendingDefaultGroup,
      rejectedUs,
      rejectedGb,
      approvedUs,
    ] = seeded;

    await prisma.programApplication.update({
      where: { id: pendingUsWithPlatforms.id },
      data: {
        formData: {
          fields: [
            {
              id: "field_1",
              type: "short-text",
              label: "How will you promote us?",
              required: true,
              value: "Newsletter",
              data: {},
            },
            {
              id: "field_2",
              type: "long-text",
              label: "Anything else?",
              required: false,
              value: "",
              data: {},
            },
          ],
        },
      },
    });

    await prisma.partnerPlatform.createMany({
      data: [
        {
          partnerId: pendingUsWithPlatforms.partnerId!,
          type: "website",
          identifier: VERIFIED_WEBSITE,
          verifiedAt: VERIFIED_AT,
        },
        {
          partnerId: pendingUsWithPlatforms.partnerId!,
          type: "twitter",
          identifier: "application_handle",
          verifiedAt: VERIFIED_AT,
        },
        {
          partnerId: pendingUsWithPlatforms.partnerId!,
          type: "youtube",
          identifier: "partner_channel",
          verifiedAt: null,
        },
      ],
    });
  });

  test.afterAll(async ({ api }) => {
    if (seeded.length > 0) {
      await prisma.programApplication.deleteMany({
        where: { id: { in: ids(seeded) } },
      });
    }

    const partnerIds = seeded.flatMap(({ partnerId }) =>
      partnerId ? [partnerId] : [],
    );

    // deletePartner uses raw SQL, which does not cascade to platforms.
    await prisma.partnerPlatform.deleteMany({
      where: { partnerId: { in: partnerIds } },
    });

    for (const partnerId of partnerIds) {
      await deletePartner(partnerId);
    }

    await deleteGroup(api, extraGroup?.id);
  });

  test("GET /program-applications", async ({ api }) => {
    const { status, data } = await listApplications(api, {
      groupId: extraGroup.id,
    });

    expect(status).toEqual(200);
    expect(ids(data)).toEqual([
      pendingUsWithPlatforms.id,
      pendingGb.id,
      pendingUs.id,
    ]);

    expect(data.find(({ id }) => id === pendingGb.id)).toStrictEqual({
      id: pendingGb.id,
      createdAt: pendingGb.createdAt.toISOString(),
      applicationFormData: [],
      partner: {
        id: pendingGb.partnerId,
        name: pendingGb.name,
        companyName: null,
        email: pendingGb.email,
        image: null,
        description: null,
        country: "GB",
        networkStatus: "draft",
        defaultPayoutMethod: null,
        payoutsEnabledAt: null,
        groupId: extraGroup.id,
        status: "pending",
        website: null,
        youtube: null,
        twitter: null,
        linkedin: null,
        instagram: null,
        tiktok: null,
        platforms: [],
      },
    });
  });

  test("GET /program-applications – platforms and applicationFormData", async ({
    api,
  }) => {
    const { status, data } = await listApplications(api, {
      search: pendingUsWithPlatforms.partnerId!,
    });

    expect(status).toEqual(200);
    expect(data).toHaveLength(1);
    expect(data[0].applicationFormData).toStrictEqual([
      { label: "How will you promote us?", value: "Newsletter" },
      { label: "Anything else?", value: null },
    ]);
    // Platforms have no defined order in the response.
    const platforms = [...(data[0].partner.platforms ?? [])].sort((a, b) =>
      a.type.localeCompare(b.type),
    );

    expect(platforms).toStrictEqual([
      {
        type: "twitter",
        identifier: "application_handle",
        verifiedAt: VERIFIED_AT.toISOString(),
      },
      {
        type: "website",
        identifier: VERIFIED_WEBSITE,
        verifiedAt: VERIFIED_AT.toISOString(),
      },
      {
        type: "youtube",
        identifier: "partner_channel",
        verifiedAt: null,
      },
    ]);
    expect(data[0].partner).toMatchObject({
      website: VERIFIED_WEBSITE,
      youtube: "partner_channel",
      twitter: "application_handle",
      linkedin: null,
      instagram: null,
      tiktok: null,
    });
  });

  test("GET /program-applications – status=rejected", async ({ api }) => {
    const { status, data } = await listApplications(api, {
      groupId: extraGroup.id,
      status: "rejected",
    });

    expect(status).toEqual(200);
    expect(ids(data)).toEqual([rejectedUs.id, rejectedGb.id]);
    expect(data.every(({ partner }) => partner.status === "rejected")).toBe(
      true,
    );
  });

  test("GET /program-applications – status=approved", async ({ api }) => {
    const { status, data } = await listApplications(api, {
      groupId: extraGroup.id,
      status: "approved",
    });
    const excludedByCountry = await listApplications(api, {
      groupId: extraGroup.id,
      country: "GB",
      status: "approved",
    });

    expect(status).toEqual(200);
    expect(ids(data)).toEqual([approvedUs.id]);
    expect(data[0].partner.status).toEqual("approved");

    expect(excludedByCountry).toEqual({ status: 200, data: [] });
  });

  test("GET /program-applications – each status only lists its own applications, excluding orphaned and other programs' applications", async ({
    api,
  }) => {
    const pending = await listApplications(api, { search: batch });
    const rejected = await listApplications(api, {
      search: batch,
      status: "rejected",
    });
    const approved = await listApplications(api, {
      search: batch,
      status: "approved",
    });

    expect(pending.status).toEqual(200);
    expect(ids(pending.data)).toEqual([
      pendingUsWithPlatforms.id,
      pendingGb.id,
      pendingUs.id,
      pendingDefaultGroup.id,
    ]);

    expect(rejected.status).toEqual(200);
    expect(ids(rejected.data)).toEqual([rejectedUs.id, rejectedGb.id]);

    expect(approved.status).toEqual(200);
    expect(ids(approved.data)).toEqual([approvedUs.id]);
  });

  test("GET /program-applications – filters by country", async ({ api }) => {
    const included = await listApplications(api, {
      groupId: extraGroup.id,
      country: "US",
    });
    const excluded = await listApplications(api, {
      groupId: extraGroup.id,
      country: "-US",
    });

    expect(included.status).toEqual(200);
    expect(ids(included.data)).toEqual([
      pendingUsWithPlatforms.id,
      pendingUs.id,
    ]);

    expect(excluded.status).toEqual(200);
    expect(ids(excluded.data)).toEqual([pendingGb.id]);
  });

  test("GET /program-applications – filters by multiple groupIds", async ({
    api,
  }) => {
    const { status, data } = await listApplications(api, {
      search: batch,
      groupId: `${extraGroup.id},${defaultGroupId}`,
    });
    const excluded = await listApplications(api, {
      search: batch,
      groupId: `-${extraGroup.id}`,
    });

    expect(status).toEqual(200);
    expect(ids(data)).toEqual([
      pendingUsWithPlatforms.id,
      pendingGb.id,
      pendingUs.id,
      pendingDefaultGroup.id,
    ]);

    expect(excluded.status).toEqual(200);
    expect(ids(excluded.data)).toEqual([pendingDefaultGroup.id]);
  });

  test("GET /program-applications – search", async ({ api }) => {
    const byName = await listApplications(api, { search: pendingGb.name });
    const byEmail = await listApplications(api, { search: pendingUs.email });
    const byPartnerId = await listApplications(api, {
      search: pendingDefaultGroup.partnerId!,
    });
    const noMatch = await listApplications(api, {
      search: `pw-app-${nanoid(12)}`,
    });

    expect(ids(byName.data)).toEqual([pendingGb.id]);
    expect(ids(byEmail.data)).toEqual([pendingUs.id]);
    expect(ids(byPartnerId.data)).toEqual([pendingDefaultGroup.id]);
    expect(noMatch).toEqual({ status: 200, data: [] });
  });

  test("GET /program-applications – sortOrder=asc", async ({ api }) => {
    const { status, data } = await listApplications(api, {
      groupId: extraGroup.id,
      sortOrder: "asc",
    });

    expect(status).toEqual(200);
    expect(ids(data)).toEqual([
      pendingUs.id,
      pendingGb.id,
      pendingUsWithPlatforms.id,
    ]);
  });

  test("GET /program-applications – offset pagination", async ({ api }) => {
    const pages = await Promise.all(
      ["1", "2", "3"].map((page) =>
        listApplications(api, {
          groupId: extraGroup.id,
          page,
          pageSize: "2",
        }),
      ),
    );

    expect(pages.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(pages.map(({ data }) => ids(data))).toEqual([
      [pendingUsWithPlatforms.id, pendingGb.id],
      [pendingUs.id],
      [],
    ]);
  });

  test("GET /program-applications/count", async ({ api }) => {
    expect(await countApplications(api, { groupId: extraGroup.id })).toEqual({
      status: 200,
      data: 3,
    });

    expect(
      await countApplications(api, {
        groupId: extraGroup.id,
        status: "rejected",
      }),
    ).toEqual({ status: 200, data: 2 });

    expect(
      await countApplications(api, {
        groupId: extraGroup.id,
        status: "approved",
      }),
    ).toEqual({ status: 200, data: 1 });

    expect(
      await countApplications(api, {
        groupId: extraGroup.id,
        country: "GB",
        status: "approved",
      }),
    ).toEqual({ status: 200, data: 0 });

    expect(
      await countApplications(api, {
        groupId: extraGroup.id,
        country: "US",
      }),
    ).toEqual({ status: 200, data: 2 });

    // Excludes approved, orphaned, and other programs' applications.
    expect(await countApplications(api, { search: batch })).toEqual({
      status: 200,
      data: 4,
    });

    expect(
      await countApplications(api, { search: batch, status: "approved" }),
    ).toEqual({ status: 200, data: 1 });
  });

  test("GET /program-applications/count – groupBy=country ignores the country filter", async ({
    api,
  }) => {
    const { status, data } = await countApplications<CountByCountry>(api, {
      groupId: extraGroup.id,
      country: "US",
      groupBy: "country",
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual([
      { country: "US", _count: 2 },
      { country: "GB", _count: 1 },
    ]);
  });

  test("GET /program-applications/count – groupBy=groupId ignores the groupId filter", async ({
    api,
  }) => {
    const { status, data } = await countApplications<CountByGroupId>(api, {
      search: batch,
      groupId: extraGroup.id,
      groupBy: "groupId",
    });

    expect(status).toEqual(200);
    expect(data).toStrictEqual([
      { groupId: extraGroup.id, _count: 3 },
      { groupId: defaultGroupId, _count: 1 },
    ]);
  });
});

const listErrorCases: ErrorCase[] = [
  {
    name: "GET /program-applications – rejects status=invited",
    params: { status: "invited" },
    message:
      'invalid_value: status: Invalid option: expected one of "pending"|"approved"|"rejected"',
  },
  {
    name: "GET /program-applications – rejects pageSize above max",
    params: { pageSize: "101" },
    message: "too_big: pageSize: Max page size is 100.",
  },
  {
    name: "GET /program-applications – rejects page=0",
    params: { page: "0" },
    message: "too_small: page: Page must be greater than 0.",
  },
  {
    name: "GET /program-applications – rejects invalid sortOrder",
    params: { sortOrder: "sideways" },
    message:
      'invalid_value: sortOrder: Invalid option: expected one of "asc"|"desc"',
  },
];

for (const { name, params, message } of listErrorCases) {
  test(name, async ({ api }) => {
    expect(await listApplications(api, params)).toEqual(
      apiError({ code: "unprocessable_entity", message }),
    );
  });
}

const countErrorCases: ErrorCase[] = [
  {
    name: "GET /program-applications/count – rejects status=invited",
    params: { status: "invited" },
    message:
      'invalid_value: status: Invalid option: expected one of "pending"|"approved"|"rejected"',
  },
  {
    name: "GET /program-applications/count – rejects invalid groupBy",
    params: { groupBy: "status" },
    message:
      'invalid_value: groupBy: Invalid option: expected one of "country"|"groupId"',
  },
];

for (const { name, params, message } of countErrorCases) {
  test(name, async ({ api }) => {
    expect(await countApplications(api, params)).toEqual(
      apiError({ code: "unprocessable_entity", message }),
    );
  });
}

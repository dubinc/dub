import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { nanoid, NETWORK_PROGRAM_ID } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { PLAYWRIGHT_API_BASE } from "../constants";
import { createBearerApiClient, test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type PartnerProfileEarning = {
  id: string;
  earnings: number;
  program: { id: string; name: string; slug: string; logo: string | null };
};

type TimeseriesPoint = {
  start: string;
  earnings: number;
  data?: Record<string, number>;
};

test.describe("GET /partner-profile/earnings", () => {
  let partnerId: string | undefined;
  let userId: string | undefined;
  let token: string;
  let programSlug: string;
  let partnerLinkIds: string[];

  // a second ordinary program in its own workspace, with customer data sharing on
  const programB = {
    workspaceId: createId({ prefix: "ws_" }),
    id: createId({ prefix: "prog_" }),
    slug: `pw-earnings-${nanoid(8).toLowerCase()}`,
    linkId: createId({ prefix: "link_" }),
    customerId: createId({ prefix: "cus_" }),
    customerEmail: `earnings-b-${nanoid(8).toLowerCase()}@example.com`,
  };

  test.beforeAll(async ({ api, program }) => {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;
    partnerLinkIds = (partner.links ?? []).map((link) => link.id);

    token = `dub_pw_${nanoid(24)}`;
    const user = await prisma.user.create({
      data: {
        id: createId({ prefix: "user_" }),
        email: partner.email,
        emailVerified: new Date(),
        defaultPartnerId: partner.id,
        partners: {
          create: {
            partnerId: partner.id,
            role: "owner",
          },
        },
        tokens: {
          create: {
            name: "Playwright partner profile earnings",
            hashedKey: await hashToken(token),
            partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
          },
        },
      },
    });
    userId = user.id;

    ({ slug: programSlug } = await prisma.program.findUniqueOrThrow({
      where: { id: program.id },
      select: { slug: true },
    }));

    // two commissions in the test program (program A), and one in the network program, which must be excluded
    // (created now, because the "all" interval starts when the test program started)
    await prisma.commission.createMany({
      data: [
        { programId: program.id, earnings: 1000 },
        { programId: program.id, earnings: 2500 },
        { programId: NETWORK_PROGRAM_ID, earnings: 9900 },
      ].map(({ programId, earnings }) => ({
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId: partner.id,
        type: "custom",
        status: "pending",
        amount: 0,
        quantity: 1,
        earnings,
      })),
    });

    await prisma.project.create({
      data: {
        id: programB.workspaceId,
        name: "Playwright Earnings B",
        slug: programB.slug,
        billingCycleStart: 1,
      },
    });
    await prisma.program.create({
      data: {
        id: programB.id,
        workspaceId: programB.workspaceId,
        name: "Playwright Earnings B",
        slug: programB.slug,
        defaultFolderId: createId({ prefix: "fold_" }),
        defaultGroupId: createId({ prefix: "grp_" }),
      },
    });
    await prisma.programEnrollment.create({
      data: {
        id: createId({ prefix: "pge_" }),
        partnerId: partner.id,
        programId: programB.id,
        status: "approved",
        customerDataSharingEnabledAt: new Date(),
      },
    });
    const linkKey = `pw-earnings-${nanoid(8).toLowerCase()}`;
    await prisma.link.create({
      data: {
        id: programB.linkId,
        domain: TEST_WORKSPACE.program.domain,
        key: linkKey,
        url: TEST_WORKSPACE.program.url,
        shortLink: `https://${TEST_WORKSPACE.program.domain}/${linkKey}`,
        projectId: programB.workspaceId,
        programId: programB.id,
        partnerId: partner.id,
      },
    });
    await prisma.customer.create({
      data: {
        id: programB.customerId,
        name: "Earnings B Customer",
        email: programB.customerEmail,
        projectId: programB.workspaceId,
      },
    });
    await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        programId: programB.id,
        partnerId: partner.id,
        linkId: programB.linkId,
        customerId: programB.customerId,
        type: "custom",
        status: "pending",
        amount: 0,
        quantity: 1,
        earnings: 4000,
      },
    });
  });

  test.afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
    await prisma.customer.deleteMany({ where: { id: programB.customerId } });
    // Prisma's emulated relations break program and project deletes, so use raw SQL like deletePartner
    await prisma.$executeRaw`DELETE FROM Program WHERE id = ${programB.id}`;
    await prisma.$executeRaw`DELETE FROM Project WHERE id = ${programB.workspaceId}`;
  });

  const withPartnerApi = async (
    playwright: Parameters<typeof createBearerApiClient>[0]["playwright"],
    run: (
      partnerApi: Awaited<ReturnType<typeof createBearerApiClient>>["api"],
    ) => Promise<void>,
  ) => {
    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token,
    });
    try {
      await run(partnerApi);
    } finally {
      await dispose();
    }
  };

  test("returns earnings across all programs, without the network program", async ({
    playwright,
    program,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<PartnerProfileEarning[]>(
        "/api/partner-profile/earnings",
      );

      expect(status).toEqual(200);
      expect(
        data
          .map((e) => [e.earnings, e.program.id] as const)
          .sort(([a], [b]) => a - b),
      ).toEqual([
        [1000, program.id],
        [2500, program.id],
        [4000, programB.id],
      ]);

      expect(
        await partnerApi.get("/api/partner-profile/earnings/count"),
      ).toMatchObject({ status: 200, data: { count: 3 } });
    });
  });

  test("counts only the requested commission type", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      expect(
        await partnerApi.get("/api/partner-profile/earnings/count?type=custom"),
      ).toMatchObject({ status: 200, data: { count: 3 } });

      expect(
        await partnerApi.get("/api/partner-profile/earnings/count?type=sale"),
      ).toMatchObject({ status: 200, data: { count: 0 } });
    });
  });

  test("counts earnings grouped by link and by customer", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      // commissions without a link/customer are omitted so filter menus have no empty option
      const byLink = await partnerApi.get<{ id: string; _count: number }[]>(
        "/api/partner-profile/earnings/count?groupBy=linkId",
      );
      expect(byLink.status).toEqual(200);
      expect(byLink.data).toEqual([
        expect.objectContaining({
          id: programB.linkId,
          domain: expect.any(String),
          key: expect.any(String),
          _count: 1,
          earnings: 4000,
        }),
      ]);

      const byCustomer = await partnerApi.get<{ id: string; _count: number }[]>(
        "/api/partner-profile/earnings/count?groupBy=customerId",
      );
      expect(byCustomer.status).toEqual(200);
      expect(byCustomer.data).toEqual([
        expect.objectContaining({
          id: programB.customerId,
          email: programB.customerEmail,
          _count: 1,
          earnings: 4000,
        }),
      ]);
    });
  });

  test("counts earnings grouped by program, within the selected program", async ({
    playwright,
    program,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const all = await partnerApi.get<
        { id: string; slug: string; _count: number; earnings: number }[]
      >("/api/partner-profile/earnings/count?groupBy=programId");

      // highest earnings first
      expect(all.status).toEqual(200);
      expect(all.data).toEqual([
        expect.objectContaining({
          id: programB.id,
          slug: programB.slug,
          _count: 1,
          earnings: 4000,
        }),
        expect.objectContaining({
          id: program.id,
          slug: programSlug,
          _count: 2,
          earnings: 3500,
        }),
      ]);

      const selected = await partnerApi.get<
        { id: string; slug: string; _count: number; earnings: number }[]
      >(
        `/api/partner-profile/earnings/count?groupBy=programId&programIdOrSlug=${programB.slug}`,
      );

      expect(selected.status).toEqual(200);
      expect(selected.data).toEqual([
        expect.objectContaining({
          id: programB.id,
          slug: programB.slug,
          _count: 1,
          earnings: 4000,
        }),
      ]);
    });
  });

  test("sums earnings grouped by commission type and by status", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      expect(
        await partnerApi.get(
          "/api/partner-profile/earnings/count?groupBy=type",
        ),
      ).toMatchObject({
        status: 200,
        data: [{ type: "custom", _count: 3, earnings: 7500 }],
      });

      expect(
        await partnerApi.get(
          "/api/partner-profile/earnings/count?groupBy=status",
        ),
      ).toMatchObject({
        status: 200,
        data: [{ status: "pending", _count: 3, earnings: 7500 }],
      });
    });
  });

  test("filters by program ID or slug", async ({ playwright, program }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      for (const programIdOrSlug of [program.id, programSlug]) {
        const { status, data } = await partnerApi.get<PartnerProfileEarning[]>(
          `/api/partner-profile/earnings?programIdOrSlug=${programIdOrSlug}`,
        );
        expect(status).toEqual(200);
        expect(data).toHaveLength(2);
      }

      const { status, data } = await partnerApi.get<PartnerProfileEarning[]>(
        `/api/partner-profile/earnings?programIdOrSlug=${programB.slug}`,
      );
      expect(status).toEqual(200);
      expect(data.map((e) => e.earnings)).toEqual([4000]);
    });
  });

  test("continues an offset page with startingAfter and endingBefore, and rejects a cursor from another program", async ({
    playwright,
    program,
  }) => {
    // two extra earnings whose createdAt order is the reverse of their ID order
    const [olderId, newerId] = [
      createId({ prefix: "cm_" }),
      createId({ prefix: "cm_" }),
    ].sort();
    const day = 24 * 60 * 60 * 1000;

    await prisma.commission.createMany({
      data: [
        { id: olderId, createdAt: new Date(Date.now() - day) },
        { id: newerId, createdAt: new Date(Date.now() - 2 * day) },
      ].map(({ id, createdAt }) => ({
        id,
        createdAt,
        programId: program.id,
        partnerId: partnerId!,
        type: "custom",
        status: "pending",
        amount: 0,
        quantity: 1,
        earnings: 100,
      })),
    });

    try {
      await withPartnerApi(playwright, async (partnerApi) => {
        const list = `/api/partner-profile/earnings?programIdOrSlug=${programSlug}`;

        const { data: all } =
          await partnerApi.get<PartnerProfileEarning[]>(list);
        const ids = all.map((e) => e.id);
        expect(ids).toHaveLength(4);
        // sorted by createdAt first, so the lower ID comes first here
        expect(ids.indexOf(olderId)).toBeLessThan(ids.indexOf(newerId));

        const firstPage = await partnerApi.get<PartnerProfileEarning[]>(
          `${list}&pageSize=2`,
        );
        expect(firstPage.data.map((e) => e.id)).toEqual(ids.slice(0, 2));

        const after = await partnerApi.get<PartnerProfileEarning[]>(
          `${list}&pageSize=2&startingAfter=${ids[1]}`,
        );
        expect(after.status).toEqual(200);
        expect(after.data.map((e) => e.id)).toEqual(ids.slice(2, 4));

        const before = await partnerApi.get<PartnerProfileEarning[]>(
          `${list}&pageSize=2&endingBefore=${ids[3]}`,
        );
        expect(before.status).toEqual(200);
        expect(before.data.map((e) => e.id)).toEqual(ids.slice(1, 3));

        const { data: allPrograms } = await partnerApi.get<
          PartnerProfileEarning[]
        >("/api/partner-profile/earnings");
        const programBEarningId = allPrograms.find(
          (e) => e.program.id === programB.id,
        )!.id;

        // a cursor that does not match the filters (every test earning is pending)
        expect(
          await partnerApi.get(`${list}&status=paid&startingAfter=${ids[0]}`),
        ).toMatchObject({ status: 422 });

        for (const cursor of [programBEarningId, "cm_doesnotexist"]) {
          expect(
            await partnerApi.get(`${list}&startingAfter=${cursor}`),
          ).toMatchObject({ status: 422 });
        }
      });
    } finally {
      await prisma.commission.deleteMany({
        where: { id: { in: [olderId, newerId] } },
      });
    }
  });

  test("pages through earnings with the same createdAt without repeating or skipping one", async ({
    playwright,
    program,
  }) => {
    // two extra earnings with the same createdAt, so that only the ID tie-breaker orders them
    const tiedIds = [createId({ prefix: "cm_" }), createId({ prefix: "cm_" })];
    const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    await prisma.commission.createMany({
      data: tiedIds.map((id) => ({
        id,
        createdAt,
        programId: program.id,
        partnerId: partnerId!,
        type: "custom",
        status: "pending",
        amount: 0,
        quantity: 1,
        earnings: 100,
      })),
    });

    try {
      await withPartnerApi(playwright, async (partnerApi) => {
        const list = `/api/partner-profile/earnings?programIdOrSlug=${programSlug}`;

        const { data: all } =
          await partnerApi.get<PartnerProfileEarning[]>(list);
        const ids = all.map((e) => e.id);
        expect(ids).toHaveLength(4);

        // the tied earnings are next to each other, higher ID first (sortOrder desc)
        const [higherId, lowerId] = [...tiedIds].sort().reverse();
        expect(ids.indexOf(lowerId)).toEqual(ids.indexOf(higherId) + 1);

        // one earning per page, with offset pages and with the cursor
        const offsetIds: string[] = [];
        const cursorIds: string[] = [];
        for (let page = 1; page <= ids.length; page++) {
          const { data } = await partnerApi.get<PartnerProfileEarning[]>(
            `${list}&pageSize=1&page=${page}`,
          );
          offsetIds.push(...data.map((e) => e.id));

          const cursor = cursorIds.at(-1);
          const { data: cursorPage } = await partnerApi.get<
            PartnerProfileEarning[]
          >(`${list}&pageSize=1${cursor ? `&startingAfter=${cursor}` : ""}`);
          cursorIds.push(...cursorPage.map((e) => e.id));
        }

        expect(offsetIds).toEqual(ids);
        expect(cursorIds).toEqual(ids);
      });
    } finally {
      await prisma.commission.deleteMany({
        where: { id: { in: tiedIds } },
      });
    }
  });

  test("returns 404 for a program the partner is not enrolled in", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      expect(
        await partnerApi.get(
          "/api/partner-profile/earnings?programIdOrSlug=prog_doesnotexist",
        ),
      ).toMatchObject({ status: 404 });

      expect(
        await partnerApi.get(
          `/api/partner-profile/earnings?programIdOrSlug=${NETWORK_PROGRAM_ID}`,
        ),
      ).toEqual(
        apiError({
          code: "not_found",
          message: "Program not found.",
        }),
      );
    });
  });

  test("sums earnings by program for the top programs", async ({
    playwright,
    program,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<
        { id: string; earnings: number }[]
      >("/api/partner-profile/earnings/analytics?groupBy=programId");

      expect(status).toEqual(200);
      expect(data).toEqual([
        expect.objectContaining({ id: programB.id, earnings: 4000 }),
        expect.objectContaining({ id: program.id, earnings: 3500 }),
      ]);
    });
  });

  test("sums earnings by commission type", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<
        { type: string; earnings: number }[]
      >("/api/partner-profile/earnings/analytics?groupBy=type");

      expect(status).toEqual(200);
      expect(data).toEqual([{ type: "custom", earnings: 7500 }]);
    });
  });

  test("groups the timeseries by program", async ({ playwright, program }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<TimeseriesPoint[]>(
        "/api/partner-profile/earnings/timeseries?groupBy=programId&timezone=UTC",
      );

      expect(status).toEqual(200);
      expect(data.reduce((sum, d) => sum + d.earnings, 0)).toEqual(7500);
      expect(
        data.reduce((sum, d) => sum + (d.data?.[program.id] ?? 0), 0),
      ).toEqual(3500);
      expect(
        data.reduce((sum, d) => sum + (d.data?.[programB.id] ?? 0), 0),
      ).toEqual(4000);
      expect(data.some((d) => d.data?.[NETWORK_PROGRAM_ID])).toBe(false);
    });
  });

  test("returns the all-time timeseries and the per-program timeseries by link", async ({
    playwright,
    program,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const allTime = await partnerApi.get<TimeseriesPoint[]>(
        "/api/partner-profile/earnings/timeseries?interval=all&timezone=UTC",
      );
      expect(allTime.status).toEqual(200);
      expect(allTime.data.reduce((sum, d) => sum + d.earnings, 0)).toEqual(
        7500,
      );

      const byLink = await partnerApi.get<TimeseriesPoint[]>(
        `/api/partner-profile/earnings/timeseries?programIdOrSlug=${program.id}&groupBy=linkId&timezone=UTC`,
      );
      expect(byLink.status).toEqual(200);
      expect(byLink.data.reduce((sum, d) => sum + d.earnings, 0)).toEqual(3500);
      expect(Object.keys(byLink.data[0].data ?? {})).toEqual(partnerLinkIds);

      // across programs, only links with earnings are included (program A's commissions have no link)
      const byLinkAcrossPrograms = await partnerApi.get<TimeseriesPoint[]>(
        "/api/partner-profile/earnings/timeseries?groupBy=linkId&timezone=UTC",
      );
      expect(byLinkAcrossPrograms.status).toEqual(200);
      for (const point of byLinkAcrossPrograms.data) {
        expect(Object.keys(point.data ?? {})).toEqual([programB.linkId]);
      }
      expect(
        byLinkAcrossPrograms.data.reduce(
          (sum, point) => sum + (point.data?.[programB.linkId] ?? 0),
          0,
        ),
      ).toEqual(4000);
    });
  });

  test("groups the timeseries across programs by the links that have earnings", async ({
    playwright,
    program,
    workspace,
  }) => {
    const [linkId] = partnerLinkIds;
    const commissionId = createId({ prefix: "cm_" });
    // a second link without earnings, which must not appear in the groups
    const idleLinkId = createId({ prefix: "link_" });
    const idleLinkKey = `pw-idle-${nanoid(8).toLowerCase()}`;

    try {
      await prisma.link.create({
        data: {
          id: idleLinkId,
          domain: TEST_WORKSPACE.program.domain,
          key: idleLinkKey,
          url: TEST_WORKSPACE.program.url,
          shortLink: `https://${TEST_WORKSPACE.program.domain}/${idleLinkKey}`,
          projectId: workspace.id,
          programId: program.id,
          partnerId: partnerId!,
        },
      });
      await prisma.commission.create({
        data: {
          id: commissionId,
          programId: program.id,
          partnerId: partnerId!,
          linkId,
          type: "custom",
          status: "pending",
          amount: 0,
          quantity: 1,
          earnings: 500,
        },
      });

      await withPartnerApi(playwright, async (partnerApi) => {
        const { status, data } = await partnerApi.get<TimeseriesPoint[]>(
          "/api/partner-profile/earnings/timeseries?groupBy=linkId&timezone=UTC",
        );

        expect(status).toEqual(200);
        for (const point of data) {
          expect(Object.keys(point.data ?? {}).sort()).toEqual(
            [linkId, programB.linkId].sort(),
          );
        }
        expect(
          data.reduce((sum, point) => sum + (point.data?.[linkId] ?? 0), 0),
        ).toEqual(500);
      });
    } finally {
      await prisma.commission.deleteMany({ where: { id: commissionId } });
      await prisma.link.deleteMany({ where: { id: idleLinkId } });
    }
  });

  test("masks the customer email in the grouped count until data sharing is on", async ({
    playwright,
    program,
    workspace,
  }) => {
    const email = `earnings-count-${nanoid(8).toLowerCase()}@example.com`;
    const customerId = createId({ prefix: "cus_" });
    const commissionId = createId({ prefix: "cm_" });
    const enrollment = {
      partnerId_programId: { partnerId: partnerId!, programId: program.id },
    };

    try {
      await prisma.customer.create({
        data: {
          id: customerId,
          name: "Earnings Count Customer",
          email,
          projectId: workspace.id,
        },
      });
      await prisma.commission.create({
        data: {
          id: commissionId,
          programId: program.id,
          partnerId: partnerId!,
          customerId,
          type: "custom",
          status: "pending",
          amount: 0,
          quantity: 1,
          earnings: 700,
        },
      });

      await withPartnerApi(playwright, async (partnerApi) => {
        const getCustomerEmail = async (id = customerId) => {
          const { status, data } = await partnerApi.get<
            { id: string | null; email: string }[]
          >("/api/partner-profile/earnings/count?groupBy=customerId");
          expect(status).toEqual(200);
          return data.find((group) => group.id === id)?.email;
        };

        const masked = await getCustomerEmail();
        expect(masked).not.toEqual(email);
        expect(masked).toContain("*");

        // program B shares customer data, so its customer's email is visible at the same time
        expect(await getCustomerEmail(programB.customerId)).toEqual(
          programB.customerEmail,
        );

        await prisma.programEnrollment.update({
          where: enrollment,
          data: { customerDataSharingEnabledAt: new Date() },
        });

        expect(await getCustomerEmail()).toEqual(email);
      });
    } finally {
      await prisma.programEnrollment.update({
        where: enrollment,
        data: { customerDataSharingEnabledAt: null },
      });
      await prisma.commission.deleteMany({ where: { id: commissionId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
  });

  test("returns 404 from the per-program timeseries for another program", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      expect(
        await partnerApi.get(
          "/api/partner-profile/earnings/timeseries?programIdOrSlug=prog_doesnotexist",
        ),
      ).toMatchObject({ status: 404 });
    });
  });

  test("returns the OG image from the chart values in the URL", async ({
    playwright,
  }) => {
    // the API client parses JSON, so read the PNG with a plain request
    const context = await playwright.request.newContext({
      baseURL: PLAYWRIGHT_API_BASE,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });

    try {
      const response = await context.get(
        "/api/og/partner-earnings?earnings=0,1500,4200&start=2026-08-01T00:00:00.000Z&end=2026-10-01T00:00:00.000Z",
      );

      expect(response.status()).toEqual(200);
      expect(response.headers()["content-type"]).toContain("image/png");

      // the image must come from the values in the URL, so other values draw another PNG
      const responseBody = await response.body();

      const changedEarningsResponse = await context.get(
        "/api/og/partner-earnings?earnings=0,1500,42000&start=2026-08-01T00:00:00.000Z&end=2026-10-01T00:00:00.000Z",
      );

      expect(changedEarningsResponse.status()).toEqual(200);
      expect(await changedEarningsResponse.body()).not.toEqual(responseBody);

      const changedDatesResponse = await context.get(
        "/api/og/partner-earnings?earnings=0,1500,4200&start=2026-07-01T00:00:00.000Z&end=2026-11-01T00:00:00.000Z",
      );

      expect(changedDatesResponse.status()).toEqual(200);
      expect(await changedDatesResponse.body()).not.toEqual(responseBody);

      // an empty value ("0," or "1,,2") must not become 0
      for (const earnings of ["0,abc", "0,", "1,,2", "1e3"]) {
        const invalidResponse = await context.get(
          `/api/og/partner-earnings?earnings=${earnings}`,
        );

        expect(invalidResponse.status()).toEqual(422);
      }
    } finally {
      await context.dispose();
    }
  });

  test("rejects a workspace token", async ({ api }) => {
    expect(await api.get("/api/partner-profile/earnings")).toEqual(
      apiError({
        code: "not_found",
        message: "Partner profile not found.",
      }),
    );
  });
});

import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { nanoid, NETWORK_PROGRAM_ID } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
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
      for (const groupBy of ["linkId", "customerId"]) {
        const { status, data } = await partnerApi.get<
          { id: string | null; _count: number }[]
        >(`/api/partner-profile/earnings/count?groupBy=${groupBy}`);

        expect(status).toEqual(200);
        expect(data.reduce((sum, group) => sum + group._count, 0)).toEqual(3);
      }
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
        `/api/partner-profile/programs/${program.id}/earnings/timeseries?groupBy=linkId&timezone=UTC`,
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

  test("returns 404 from the per-program timeseries and the OG image for another program", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      expect(
        await partnerApi.get(
          "/api/partner-profile/programs/prog_doesnotexist/earnings/timeseries",
        ),
      ).toMatchObject({ status: 404 });

      expect(
        await partnerApi.get(
          "/api/og/partner-earnings?programId=prog_doesnotexist",
        ),
      ).toMatchObject({ status: 404 });
    });
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

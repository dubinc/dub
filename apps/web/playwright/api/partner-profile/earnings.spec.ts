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

    // two commissions in the test program, and one in the network program, which must be excluded
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
  });

  test.afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
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
      expect(data.map((e) => e.earnings).sort((a, b) => a - b)).toEqual([
        1000, 2500,
      ]);
      for (const earning of data) {
        expect(earning.program).toMatchObject({
          id: program.id,
          slug: programSlug,
        });
      }

      expect(
        await partnerApi.get("/api/partner-profile/earnings/count"),
      ).toMatchObject({ status: 200, data: { count: 2 } });
    });
  });

  test("counts only the requested commission type", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      expect(
        await partnerApi.get("/api/partner-profile/earnings/count?type=custom"),
      ).toMatchObject({ status: 200, data: { count: 2 } });

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
        expect(data.reduce((sum, group) => sum + group._count, 0)).toEqual(2);
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
      >("/api/partner-profile/earnings/top?groupBy=programId");

      expect(status).toEqual(200);
      expect(data).toEqual([
        expect.objectContaining({ id: program.id, earnings: 3500 }),
      ]);
    });
  });

  test("groups the timeseries by program", async ({ playwright, program }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<TimeseriesPoint[]>(
        "/api/partner-profile/earnings/timeseries?groupBy=programId&timezone=UTC",
      );

      expect(status).toEqual(200);
      expect(data.reduce((sum, d) => sum + d.earnings, 0)).toEqual(3500);
      expect(
        data.reduce((sum, d) => sum + (d.data?.[program.id] ?? 0), 0),
      ).toEqual(3500);
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
        3500,
      );

      const byLink = await partnerApi.get<TimeseriesPoint[]>(
        `/api/partner-profile/programs/${program.id}/earnings/timeseries?groupBy=linkId&timezone=UTC`,
      );
      expect(byLink.status).toEqual(200);
      expect(byLink.data.reduce((sum, d) => sum + d.earnings, 0)).toEqual(3500);
      expect(Object.keys(byLink.data[0].data ?? {})).toEqual(partnerLinkIds);

      // across programs, only links with earnings are included, and the test commissions have no link
      const byLinkAcrossPrograms = await partnerApi.get<TimeseriesPoint[]>(
        "/api/partner-profile/earnings/timeseries?groupBy=linkId&timezone=UTC",
      );
      expect(byLinkAcrossPrograms.status).toEqual(200);
      for (const point of byLinkAcrossPrograms.data) {
        expect(point.data).toEqual({});
      }
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
          expect(Object.keys(point.data ?? {})).toEqual([linkId]);
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
        const getCustomerEmail = async () => {
          const { status, data } = await partnerApi.get<
            { id: string | null; email: string }[]
          >("/api/partner-profile/earnings/count?groupBy=customerId");
          expect(status).toEqual(200);
          return data.find((group) => group.id === customerId)?.email;
        };

        const masked = await getCustomerEmail();
        expect(masked).not.toEqual(email);
        expect(masked).toContain("*");

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

import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { nanoid, NETWORK_PROGRAM_ID } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { createBearerApiClient, test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

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

const DAY = 24 * 60 * 60 * 1000;

test.describe("GET /partner-profile/earnings", () => {
  let partnerId: string | undefined;
  let userId: string | undefined;
  let token: string;
  let programSlug: string;

  test.beforeAll(async ({ api, program }) => {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

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
    await prisma.commission.createMany({
      data: [
        { programId: program.id, earnings: 1000, daysAgo: 2 },
        { programId: program.id, earnings: 2500, daysAgo: 5 },
        { programId: NETWORK_PROGRAM_ID, earnings: 9900, daysAgo: 3 },
      ].map(({ programId, earnings, daysAgo }) => ({
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId: partner.id,
        type: "custom",
        status: "pending",
        amount: 0,
        quantity: 1,
        earnings,
        createdAt: new Date(Date.now() - daysAgo * DAY),
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
      expect(data.map((e) => e.earnings).sort()).toEqual([1000, 2500]);
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

  test("rejects a workspace token", async ({ api }) => {
    expect(await api.get("/api/partner-profile/earnings")).toEqual(
      apiError({
        code: "not_found",
        message: "Partner profile not found.",
      }),
    );
  });
});
